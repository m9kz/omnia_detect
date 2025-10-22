from pydantic import BaseModel
from uuid import UUID


class UploadResponse(BaseModel):
    image_id: UUID
    url: str
    width: int
    height: int
    filename: str