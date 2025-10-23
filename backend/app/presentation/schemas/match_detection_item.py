from typing import Optional
from pydantic import BaseModel

from app.presentation.schemas.bbox import BBoxSchema


class MatchDetectionItem(BaseModel):
    class_name: str
    confidence: float
    bbox: BBoxSchema
    identity_name: Optional[str] = None
    similarity: Optional[float] = None

