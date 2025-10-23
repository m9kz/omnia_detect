from dataclasses import dataclass, field
from datetime import datetime, timezone
from uuid import UUID


@dataclass
class ModelArtifact:
    id: UUID
    dataset_id: UUID
    base_weights: str
    best_weights_path: str
    epochs: int
    imgsz: int
    metrics_path: str | None  # optional path to results.yaml
    created_at: datetime = field(default_factory=datetime.now(timezone.utc))