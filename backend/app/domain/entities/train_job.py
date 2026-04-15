from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Literal
from uuid import UUID


TrainJobStatus = Literal["queued", "running", "completed", "failed"]

PENDING_TRAIN_JOB_STATUSES: tuple[TrainJobStatus, TrainJobStatus] = ("queued", "running")


@dataclass
class TrainJob:
    id: UUID
    dataset_id: UUID
    status: TrainJobStatus
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
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    started_at: datetime | None = None
    finished_at: datetime | None = None
