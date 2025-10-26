from typing import Iterable, Protocol
from uuid import UUID

from app.domain.entities.model_artifact import ModelArtifact


class IModelRepository(Protocol):
    def add(self, m: ModelArtifact) -> None: 
        ...
    def get(self, model_id: UUID) -> ModelArtifact | None: 
        ...
    def list(self, limit: int = 50) -> Iterable[ModelArtifact]: 
        ...
