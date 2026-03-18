from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class ModelDetailSchema(BaseModel):
    id: UUID
    dataset_id: UUID
    best_weights_path: str
    epochs: int
    imgsz: int
    created_at: datetime
    metrics_path: str | None
    is_active: bool
    download_weights_url: str
    artifact_urls: dict[str, str]
    preview_urls: dict[str, str]
