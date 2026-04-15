from typing import Protocol
from uuid import UUID


class TrainJobDispatcher(Protocol):
    def submit(self, job_id: UUID) -> None:
        ...
