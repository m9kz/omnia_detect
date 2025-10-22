from uuid import UUID
from pydantic import BaseModel

from app.presentation.schemas.match_detection_item import MatchDetectionItem


class MatchResponse(BaseModel):
    image_id: UUID
    matches: list[MatchDetectionItem]
