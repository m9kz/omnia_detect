import queue
import threading
from datetime import datetime, timezone
from uuid import UUID

from app.application.ports.trainer import IModelTrainer
from app.domain.entities.model_artifact import ModelArtifact
from app.domain.entities.train_job import PENDING_TRAIN_JOB_STATUSES, TrainJob
from app.infrastructure.repositories.repo_sqlite import SessionFactory, SqlAlchemyUnitOfWork


class TrainJobRunner:
    def __init__(self, session_factory: SessionFactory, trainer: IModelTrainer):
        self._session_factory = session_factory
        self._trainer = trainer
        self._queue: queue.Queue[UUID | None] = queue.Queue()
        self._scheduled_ids: set[UUID] = set()
        self._lock = threading.Lock()
        self._stop_event = threading.Event()
        self._thread: threading.Thread | None = None

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return

        self._stop_event.clear()
        self._thread = threading.Thread(
            target=self._worker_loop,
            name="train-job-runner",
            daemon=True,
        )
        self._thread.start()

    def stop(self) -> None:
        self._stop_event.set()
        self._queue.put(None)
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=5)

    def submit(self, job_id: UUID) -> None:
        with self._lock:
            if job_id in self._scheduled_ids:
                return
            self._scheduled_ids.add(job_id)

        self._queue.put(job_id)

    def resume_pending_jobs(self) -> None:
        pending_jobs: list[TrainJob] = []

        with SqlAlchemyUnitOfWork(self._session_factory) as u:
            for job in u.jobs.list_pending(limit=200):
                if job.status == "running":
                    job.status = "queued"
                    job.message = "Requeued after application restart"
                    job.error = None
                    job.started_at = None
                    job.finished_at = None
                    u.jobs.update(job)

                pending_jobs.append(job)

            u.commit()

        for job in pending_jobs:
            self.submit(job.id)

    def _worker_loop(self) -> None:
        while not self._stop_event.is_set():
            try:
                job_id = self._queue.get(timeout=0.5)
            except queue.Empty:
                continue

            if job_id is None:
                self._queue.task_done()
                continue

            try:
                self._run_job(job_id)
            finally:
                with self._lock:
                    self._scheduled_ids.discard(job_id)
                self._queue.task_done()

    def _run_job(self, job_id: UUID) -> None:
        with SqlAlchemyUnitOfWork(self._session_factory) as u:
            job = u.jobs.get(job_id)
            if not job:
                return

            dataset = u.datasets.get(job.dataset_id)
            if not dataset:
                job.status = "failed"
                job.error = "Dataset not found"
                job.message = "Training job failed before start"
                job.finished_at = datetime.now(timezone.utc)
                u.jobs.update(job)
                u.commit()
                return

            job.status = "running"
            job.progress = 0
            job.current_epoch = 0
            job.error = None
            job.message = "Preparing training run"
            job.started_at = datetime.now(timezone.utc)
            job.finished_at = None
            u.jobs.update(job)
            u.commit()

            dataset_zip_path = dataset.zip_relpath
            base_weights = job.base_weights
            epochs = job.epochs
            imgsz = job.imgsz

        def progress_callback(
            current_epoch: int | None,
            total_epochs: int | None,
            message: str | None,
        ) -> None:
            with SqlAlchemyUnitOfWork(self._session_factory) as progress_uow:
                progress_job = progress_uow.jobs.get(job_id)
                if not progress_job or progress_job.status not in PENDING_TRAIN_JOB_STATUSES:
                    return

                total = total_epochs or progress_job.total_epochs or 0
                epoch_value = current_epoch if current_epoch is not None else progress_job.current_epoch
                progress = 0
                if total > 0 and epoch_value is not None:
                    progress = round((epoch_value / total) * 100)

                progress_job.progress = max(0, min(progress, 99))
                progress_job.current_epoch = epoch_value
                progress_job.total_epochs = total or progress_job.total_epochs
                progress_job.message = message
                progress_uow.jobs.update(progress_job)
                progress_uow.commit()

        try:
            model_id, best_weights_path, metrics_path = self._trainer.train(
                base_weights_path=base_weights,
                zip_path=dataset_zip_path,
                epochs=epochs,
                imgsz=imgsz,
                progress_callback=progress_callback,
            )
        except Exception as exc:
            with SqlAlchemyUnitOfWork(self._session_factory) as u:
                failed_job = u.jobs.get(job_id)
                if not failed_job:
                    return

                failed_job.status = "failed"
                failed_job.error = str(exc)
                failed_job.message = "Training failed"
                failed_job.finished_at = datetime.now(timezone.utc)
                u.jobs.update(failed_job)
                u.commit()
            return

        artifact = ModelArtifact(
            id=model_id,
            dataset_id=job.dataset_id,
            base_weights=base_weights,
            best_weights_path=best_weights_path,
            epochs=epochs,
            imgsz=imgsz,
            metrics_path=metrics_path,
            created_at=datetime.now(timezone.utc),
        )

        with SqlAlchemyUnitOfWork(self._session_factory) as u:
            completed_job = u.jobs.get(job_id)
            if not completed_job:
                return

            u.models.add(artifact)
            completed_job.status = "completed"
            completed_job.progress = 100
            completed_job.current_epoch = completed_job.total_epochs
            completed_job.model_id = model_id
            completed_job.error = None
            completed_job.message = "Training completed"
            completed_job.finished_at = datetime.now(timezone.utc)
            u.jobs.update(completed_job)
            u.commit()
