from uuid import UUID
from datetime import datetime

from pydantic import BaseModel


class ModelItemSchema(BaseModel):
    id: UUID
    dataset_id: UUID
    best_weights_path: str
    epochs: int
    imgsz: int
    created_at: datetime
    metrics_path: str | None


