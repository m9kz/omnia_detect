from typing import Self, Protocol

from app.domain.ports.repositories.image import ImageRepository
from app.domain.ports.repositories.label import ILabelRepository
from app.domain.ports.repositories.model import IModelRepository
from app.domain.ports.repositories.dataset import IDatasetRepository
from app.domain.ports.repositories.identity import IdentityRepository
from app.domain.ports.repositories.identity_embedding import IdentityEmbeddingRepository


class UnitOfWork(Protocol):
    images: "ImageRepository"
    models: "IModelRepository"
    datasets: "IDatasetRepository"
    labels: "ILabelRepository"
    identity: "IdentityRepository"
    identity_embeddings: "IdentityEmbeddingRepository"

    def __enter__(self) -> Self: 
        ...
    def __exit__(self, exc_type, exc, tb): 
        ...
    def commit(self): 
        ...
