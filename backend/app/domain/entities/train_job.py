from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Literal
from uuid import UUID

from app.domain.exceptions.base import ValidationException


TrainJobStatus = Literal["queued", "running", "completed", "failed"]
TRAIN_JOB_STATUSES: set[str] = {"queued", "running", "completed", "failed"}

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
    model_name: str | None
    message: str | None
    error: str | None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    started_at: datetime | None = None
    finished_at: datetime | None = None

    def __post_init__(self) -> None:
        if self.status not in TRAIN_JOB_STATUSES:
            raise ValidationException(f"Unsupported train job status: {self.status}")

        if not 0 <= self.progress <= 100:
            raise ValidationException("Train job progress must be between 0 and 100")

        if self.epochs < 1 or self.total_epochs < 1:
            raise ValidationException("Train job epochs must be greater than 0")

        if self.imgsz < 32:
            raise ValidationException("Train job image size must be at least 32")
