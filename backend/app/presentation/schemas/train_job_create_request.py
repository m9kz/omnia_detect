from uuid import UUID

from pydantic import BaseModel, Field


class TrainJobCreateRequestSchema(BaseModel):
    dataset_id: UUID
    epochs: int = Field(default=5, ge=1)
    imgsz: int = Field(default=640, ge=32)
