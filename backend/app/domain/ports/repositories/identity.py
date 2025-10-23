from typing import Iterable, Protocol
from uuid import UUID

from app.domain.entities.identity import Identity


class IdentityRepository(Protocol):
    def add(self, identity: Identity) -> None: 
        ...
    def get(self, identity_id: UUID) -> Identity | None: 
        ...
    def get_by_name(self, name: str) -> Identity | None: 
        ...
    def list(self, limit: int = 50) -> Iterable[Identity]: 
        ...