from dataclasses import dataclass

from app.domain.entities.image_item import ImageItem
from app.domain.entities.label import Label


@dataclass
class DetectionResult:
    image: ImageItem
    labels: list[Label]
