from typing import Protocol
from app.domain.value_objects.weights_path import WeightsPath
from app.domain.entities.model_handle import ModelHandle


class IModelLoader(Protocol):
    """Atomic swap of the active model reference."""
    def load(self, weights: WeightsPath) -> ModelHandle:
        ...
