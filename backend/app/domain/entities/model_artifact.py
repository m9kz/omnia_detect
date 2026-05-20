from dataclasses import dataclass, field
from datetime import datetime, timezone
from uuid import UUID

from app.domain.exceptions.base import ValidationException


@dataclass
class ModelArtifact:
    id: UUID
    user_id: str
    name: str
    dataset_id: UUID
    base_weights: str
    best_weights_path: str
    epochs: int
    imgsz: int
    metrics_path: str | None  # optional path to results.yaml
    size_bytes: int
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def rename(self, name: str) -> None:
        value = name.strip()
        if not value:
            raise ValidationException("Model name cannot be empty")

        self.name = value[:80]
