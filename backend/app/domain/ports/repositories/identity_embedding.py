from typing import Protocol
from uuid import UUID

from app.domain.entities.identity_embedding import IdentityEmbedding


class IdentityEmbeddingRepository(Protocol):
    def add_many(self, items: list[IdentityEmbedding]) -> None: 
        ...
    def list_for_identity(self, identity_id: UUID) -> list[IdentityEmbedding]: 
        ...
    def list_all(self) -> list[IdentityEmbedding]: 
        ...