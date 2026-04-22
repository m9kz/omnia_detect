from uuid import UUID
from dataclasses import dataclass


@dataclass
class DownloadDTO:
    image_id: UUID
    url: str
    filename: str
    width: int
    height: int
    image_bytes: bytes
