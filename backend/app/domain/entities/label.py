from dataclasses import dataclass
from typing import Optional
from app.domain.value_objects.bbox import BBox
from uuid import UUID


@dataclass
class Label:
    id: UUID
    image_id: UUID
    class_name: str
    bbox: BBox
    confidence: Optional[float] = None
    source: str = "model"  # "model" | "human"