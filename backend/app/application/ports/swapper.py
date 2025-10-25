from typing import Protocol
from app.domain.entities.model_handle import ModelHandle


class IModelSwapper(Protocol):
    """Atomic swap of the active model reference."""
    def get_current(self) -> ModelHandle:
        ...
    
    def swap(self, new_model: ModelHandle) -> None:
        ...
    
    def rollback(self) -> ModelHandle | None:
        ...
