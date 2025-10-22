from dataclasses import dataclass
from uuid import UUID


@dataclass
class IdentityEmbedding:
    id: UUID
    identity_id: UUID
    vector: list[float]
