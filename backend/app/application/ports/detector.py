from typing import Protocol
from app.domain.entities.label import Label
from app.domain.entities.model_handle import ModelHandle


class IModelDetector(Protocol):
    def detect(self, model: ModelHandle, image_bytes: bytes) -> list[Label]:
        """Returns model-generated labels (normalized bboxes)."""
        ...
