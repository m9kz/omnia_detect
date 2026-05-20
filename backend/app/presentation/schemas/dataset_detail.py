from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class DatasetDetailSchema(BaseModel):
    id: UUID
    name: str
    class_names: list[str]
    ratio: float
    num_pairs: int
    train_count: int
    val_count: int
    size_bytes: int
    created_at: datetime
    download_url: str
    zip_relpath: str
    zip_exists: bool
