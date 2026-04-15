from uuid import UUID

from typing import Protocol


class IModelTrainer(Protocol):
    def train(
        self,
        base_weights_path: str,
        zip_path: str,
        epochs: int = 5,
        imgsz: int = 640,
        progress_callback=None,
    ) -> tuple[UUID, str, str | None]:
        """Train from the given base weights and return the stored artifact paths."""
        ...
