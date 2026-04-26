from typing import Self, Protocol

from app.domain.ports.repositories.dataset import IDatasetRepository
from app.domain.ports.repositories.image import ImageRepository
from app.domain.ports.repositories.label import ILabelRepository
from app.domain.ports.repositories.model import IModelRepository
from app.domain.ports.repositories.train_job import ITrainJobRepository
from app.domain.ports.repositories.user import IUserRepository


class UnitOfWork(Protocol):
    users: "IUserRepository"
    images: "ImageRepository"
    models: "IModelRepository"
    datasets: "IDatasetRepository"
    labels: "ILabelRepository"
    jobs: "ITrainJobRepository"

    def __enter__(self) -> Self:
        ...

    def __exit__(self, exc_type, exc, tb):
        ...

    def commit(self):
        ...
