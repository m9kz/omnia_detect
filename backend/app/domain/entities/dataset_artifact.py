from dataclasses import dataclass, field
from datetime import datetime, timezone
from uuid import UUID


@dataclass
class DatasetArtifact:
    id: UUID
    class_names: list[str]
    ratio: float
    num_pairs: int
    train_count: int
    val_count: int
    zip_relpath: str            # e.g. "data/datasets/<id>/dataset.zip"
    created_at: datetime = field(default_factory=datetime.now(timezone.utc))