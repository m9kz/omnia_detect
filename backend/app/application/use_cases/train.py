import shutil
from datetime import datetime, timezone
from pathlib import Path
from uuid import UUID

from app.application.ports.swapper import IModelSwapper
from app.application.ports.trainer import IModelTrainer
from app.application.ports.uow import UnitOfWork
from app.core.config import settings
from app.domain.entities.model_artifact import ModelArtifact
from app.domain.exceptions.base import NotFoundException, QuotaExceededException, ValidationException
from app.domain.value_objects.storage_quota import StorageQuotaSnapshot


class TrainModelUseCase:
    def __init__(self, trainer: IModelTrainer, swapper: IModelSwapper, uow: UnitOfWork):
        self.trainer = trainer
        self.swapper = swapper
        self.uow = uow

    def execute(
        self,
        user_id: str,
        dataset_id: UUID,
        epochs: int = 5,
        imgsz: int = 640,
        name: str | None = None,
    ) -> ModelArtifact:
        if epochs < 1:
            raise ValidationException("epochs must be greater than 0")

        if imgsz < 32:
            raise ValidationException("imgsz must be at least 32")

        with self.uow as u:
            ds = u.datasets.get_for_user(dataset_id, user_id)
            if not ds:
                raise NotFoundException("Dataset not found")
            zip_path = ds.zip_relpath

        model = self.swapper.get_current()
        base_weights = getattr(model, "_weights_path", None) or settings.YOLO_WEIGHTS
        base_model_id_raw = getattr(model, "_model_id", None)
        if base_model_id_raw:
            with self.uow as u:
                try:
                    base_model_id = UUID(base_model_id_raw)
                except ValueError:
                    base_model_id = None

                if not base_model_id or not u.models.get_for_user(base_model_id, user_id):
                    base_weights = settings.YOLO_WEIGHTS

        job_id, best_path, metrics_path, size_bytes = self.trainer.train(
            base_weights_path=base_weights,
            zip_path=zip_path,
            epochs=epochs,
            imgsz=imgsz,
        )

        with self.uow as u:
            used_bytes = (
                u.datasets.sum_size_for_user(user_id)
                + u.models.sum_size_for_user(user_id)
            )

        try:
            StorageQuotaSnapshot(
                used_bytes=used_bytes,
                quota_bytes=settings.USER_STORAGE_QUOTA_BYTES,
            ).ensure_can_add(size_bytes)
        except QuotaExceededException:
            self._cleanup_model_outputs(job_id)
            raise

        artifact = ModelArtifact(
            id=job_id,
            user_id=user_id,
            name=f"Model {str(job_id)[:8]}",
            dataset_id=dataset_id,
            base_weights=base_weights,
            best_weights_path=best_path,
            epochs=epochs,
            imgsz=imgsz,
            metrics_path=metrics_path,
            size_bytes=size_bytes,
            created_at=datetime.now(timezone.utc),
        )
        if name and name.strip():
            artifact.rename(name)

        with self.uow as u:
            u.models.add(artifact)
            u.commit()

        return artifact

    @staticmethod
    def _cleanup_model_outputs(model_id: UUID) -> None:
        for path in (
            Path("ml_models/finetuned") / str(model_id),
            Path("ml_models/runs/detect") / str(model_id),
            Path("data/train_jobs") / str(model_id),
        ):
            if path.exists():
                shutil.rmtree(path, ignore_errors=True)
