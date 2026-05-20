from dataclasses import dataclass, field
from datetime import datetime, timezone
from uuid import UUID

from app.domain.exceptions.base import ValidationException


@dataclass
class DatasetArtifact:
    id: UUID
    user_id: str
    name: str
    class_names: list[str]
    ratio: float
    num_pairs: int
    train_count: int
    val_count: int
    zip_relpath: str            # e.g. "data/datasets/<id>/dataset.zip"
    size_bytes: int
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def rename(self, name: str) -> None:
        value = name.strip()
        if not value:
            raise ValidationException("Dataset name cannot be empty")

        self.name = value[:80]
