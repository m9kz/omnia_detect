from pydantic import BaseModel
from app.presentation.schemas.bbox import BBoxSchema


class DetectionItemSchema(BaseModel):
    class_name: str
    confidence: float
    bbox: BBoxSchema
