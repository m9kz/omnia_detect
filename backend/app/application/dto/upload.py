from uuid import UUID
from dataclasses import dataclass


@dataclass
class UploadDTO:
    image_id: UUID
    url: str
    width: int
    height: int
    filename: str
