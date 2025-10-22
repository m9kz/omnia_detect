from dataclasses import dataclass
from app.domain.value_objects.bbox import BBox


@dataclass
class DetectionDTO:
    class_name: str
    confidence: float
    bbox: BBox
