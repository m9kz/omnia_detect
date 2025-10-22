from uuid import uuid4
from app.core.config import settings

from uuid import UUID

from app.domain.entities.model_artifact import ModelArtifact
from app.application.ports.uow import UnitOfWork
from app.application.ports.trainer import IModelTrainer


class TrainModelUseCase:
    def __init__(self, trainer: IModelTrainer, uow: UnitOfWork):
        self.trainer = trainer
        self.uow = uow

    def execute(self, dataset_id: UUID, epochs: int = 5, imgsz: int = 640) -> ModelArtifact:
        with self.uow as u:
            ds = u.datasets.get(dataset_id)
            if not ds:
                raise ValueError("Dataset not found")
            zip_path = ds.zip_relpath

        job_id, best_path, metrics_path = self.trainer.train(
            zip_path, epochs=epochs, imgsz=imgsz
        )

        artifact = ModelArtifact(
            id=uuid4(),
            dataset_id=dataset_id,
            base_weights=settings.YOLO_WEIGHTS,
            best_weights_path=best_path,
            epochs=epochs,
            imgsz=imgsz,
            metrics_path=metrics_path
        )
        
        with self.uow as u:
            u.models.add(artifact)
            u.commit()
        
        return artifact
