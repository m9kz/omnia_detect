from typing import Protocol
from pathlib import Path

from app.domain.value_objects.weights_path import WeightsPath


class IWeightsRepository(Protocol):
    def get(self) -> None: 
        ...
    def get_by_path(self, path: str) -> WeightsPath | None: 
        ...
    def add(self, new_weights: Path) -> WeightsPath: 
        ...
