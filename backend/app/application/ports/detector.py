from typing import Protocol
from app.domain.entities.label import Label


class Detector(Protocol):
    def detect(self, image_bytes: bytes) -> list[Label]:
        """Returns model-generated labels (normalized bboxes)."""
        ...
