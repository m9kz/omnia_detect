from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class DatasetDetailSchema(BaseModel):
    id: UUID
    class_names: list[str]
    ratio: float
    num_pairs: int
    train_count: int
    val_count: int
    created_at: datetime
    download_url: str
    zip_relpath: str
    zip_exists: bool
