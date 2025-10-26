from typing import Protocol, Iterable
from uuid import UUID
from app.domain.entities.dataset_artifact import DatasetArtifact


class IDatasetRepository(Protocol):
    def add(self, ds: DatasetArtifact) -> None: 
        ...
    def get(self, dataset_id: UUID) -> DatasetArtifact | None: 
        ...
    def list(self, limit: int = 50) -> Iterable[DatasetArtifact]: 
        ...
