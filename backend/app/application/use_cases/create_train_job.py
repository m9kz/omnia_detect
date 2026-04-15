from datetime import datetime, timezone
from uuid import UUID, uuid4

from app.application.ports.swapper import IModelSwapper
from app.application.ports.train_job_dispatcher import TrainJobDispatcher
from app.application.ports.uow import UnitOfWork
from app.core.config import settings
from app.domain.entities.train_job import TrainJob


class CreateTrainJobUseCase:
    def __init__(
        self,
        uow: UnitOfWork,
        swapper: IModelSwapper,
        dispatcher: TrainJobDispatcher,
    ):
        self.uow = uow
        self.swapper = swapper
        self.dispatcher = dispatcher

    def execute(self, dataset_id: UUID, epochs: int = 5, imgsz: int = 640) -> TrainJob:
        with self.uow as u:
            dataset = u.datasets.get(dataset_id)
            if not dataset:
                raise LookupError("Dataset not found")

        handle = self.swapper.get_current()
        base_weights = getattr(handle, "_weights_path", None) or settings.YOLO_WEIGHTS
        base_model_id_raw = getattr(handle, "_model_id", None)
        base_model_id = UUID(base_model_id_raw) if base_model_id_raw else None
        now = datetime.now(timezone.utc)

        job = TrainJob(
            id=uuid4(),
            dataset_id=dataset_id,
            status="queued",
            progress=0,
            current_epoch=0,
            total_epochs=epochs,
            epochs=epochs,
            imgsz=imgsz,
            base_weights=base_weights,
            base_model_id=base_model_id,
            model_id=None,
            message="Queued for training",
            error=None,
            created_at=now,
            started_at=None,
            finished_at=None,
        )

        with self.uow as u:
            u.jobs.add(job)
            u.commit()

        self.dispatcher.submit(job.id)
        return job
