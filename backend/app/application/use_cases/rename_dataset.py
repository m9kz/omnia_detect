from uuid import UUID

from app.application.ports.uow import UnitOfWork
from app.domain.entities.dataset_artifact import DatasetArtifact


class RenameDatasetUseCase:
    def __init__(self, uow: UnitOfWork):
        self.uow = uow

    def execute(self, dataset_id: UUID, name: str) -> DatasetArtifact:
        with self.uow as u:
            dataset = u.datasets.get(dataset_id)
            if not dataset:
                raise LookupError("Dataset not found")

            dataset.rename(name)
            u.datasets.update(dataset)
            u.commit()

            return dataset
