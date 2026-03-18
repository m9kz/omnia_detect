from datetime import datetime, timezone
from uuid import UUID

from app.application.ports.swapper import IModelSwapper
from app.application.ports.trainer import IModelTrainer
from app.application.ports.uow import UnitOfWork
from app.core.config import settings
from app.domain.entities.model_artifact import ModelArtifact


class TrainModelUseCase:
    def __init__(self, trainer: IModelTrainer, swapper: IModelSwapper, uow: UnitOfWork):
        self.trainer = trainer
        self.swapper = swapper
        self.uow = uow

    def execute(self, dataset_id: UUID, epochs: int = 5, imgsz: int = 640) -> ModelArtifact:
        with self.uow as u:
            ds = u.datasets.get(dataset_id)
            if not ds:
                raise ValueError("Dataset not found")
            zip_path = ds.zip_relpath

        model = self.swapper.get_current()    

        job_id, best_path, metrics_path = self.trainer.train(
            model, zip_path, epochs=epochs, imgsz=imgsz
        )

        artifact = ModelArtifact(
            id=job_id,
            dataset_id=dataset_id,
            base_weights=settings.YOLO_WEIGHTS,
            best_weights_path=best_path,
            epochs=epochs,
            imgsz=imgsz,
            metrics_path=metrics_path,
            created_at=datetime.now(timezone.utc)
        )
        
        with self.uow as u:
            u.models.add(artifact)
            u.commit()
        
        return artifact
