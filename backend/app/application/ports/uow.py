from typing import Protocol

from app.domain.ports.repositories.image import ImageRepository
from app.domain.ports.repositories.label import LabelRepository
from app.domain.ports.repositories.identity import IdentityRepository
from app.domain.ports.repositories.identity_embedding import IdentityEmbeddingRepository


class UnitOfWork(Protocol):
    images: "ImageRepository"
    labels: "LabelRepository"
    identity: "IdentityRepository"
    identity_embeddings: "IdentityEmbeddingRepository"

    def __enter__(self): 
        ...
    def __exit__(self, exc_type, exc, tb): 
        ...
    def commit(self): 
        ...
