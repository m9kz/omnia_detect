from uuid import UUID
from dataclasses import dataclass


@dataclass
class DownloadDTO:
    image_id: UUID
    url: str
    width: int
    height: int
    image_bytes: str
