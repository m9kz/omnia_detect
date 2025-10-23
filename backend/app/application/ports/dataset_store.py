from typing import Protocol
from uuid import UUID


class DatasetStore(Protocol):
    def save(self, dataset_id: UUID, zip_bytes: bytes) -> str:
        """Returns (public_url, width, height)."""
        ...

