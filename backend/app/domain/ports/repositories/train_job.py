from typing import Iterable, Protocol
from uuid import UUID

from app.domain.entities.train_job import TrainJob


class ITrainJobRepository(Protocol):
    def add(self, job: TrainJob) -> None:
        ...

    def get(self, job_id: UUID) -> TrainJob | None:
        ...

    def get_for_user(self, job_id: UUID, user_id: str) -> TrainJob | None:
        ...

    def update(self, job: TrainJob) -> None:
        ...

    def list(self, limit: int = 50) -> Iterable[TrainJob]:
        ...

    def list_for_user(self, user_id: str, limit: int = 50) -> Iterable[TrainJob]:
        ...

    def list_pending(self, limit: int = 100) -> Iterable[TrainJob]:
        ...

    def list_pending_for_dataset(self, dataset_id: UUID) -> Iterable[TrainJob]:
        ...

    def list_pending_for_dataset_for_user(
        self,
        dataset_id: UUID,
        user_id: str,
    ) -> Iterable[TrainJob]:
        ...

    def list_pending_for_base_model(self, model_id: UUID) -> Iterable[TrainJob]:
        ...

    def list_pending_for_base_model_for_user(
        self,
        model_id: UUID,
        user_id: str,
    ) -> Iterable[TrainJob]:
        ...
