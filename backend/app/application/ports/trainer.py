from typing import Protocol


class IModelTrainer(Protocol):
    def train(self, zip_path: str, epochs: int, imgsz: int):
        """Return L2-normalized embedding vector."""
        ...
