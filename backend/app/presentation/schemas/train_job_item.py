from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel


class TrainJobItemSchema(BaseModel):
    id: UUID
    dataset_id: UUID
    status: Literal["queued", "running", "completed", "failed"]
    progress: int
    current_epoch: int | None
    total_epochs: int
    epochs: int
    imgsz: int
    base_weights: str
    base_model_id: UUID | None
    model_id: UUID | None
    message: str | None
    error: str | None
    created_at: datetime
    started_at: datetime | None
    finished_at: datetime | None
