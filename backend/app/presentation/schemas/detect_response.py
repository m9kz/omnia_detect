from pydantic import BaseModel
from uuid import UUID

from app.presentation.schemas.detection_item import DetectionItemSchema


class DetectResponse(BaseModel):
    image_id: UUID
    detections: list[DetectionItemSchema]
