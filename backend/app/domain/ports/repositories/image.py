from typing import Protocol, Iterable
from uuid import UUID

from app.domain.entities.image_item import ImageItem


class ImageRepository(Protocol):
    def add(self, img: ImageItem) -> None: 
        ...
    def get(self, image_id: UUID) -> ImageItem | None: 
        ...
    def list(self, query: str | None = None, limit: int = 20) -> Iterable[ImageItem]: 
        ...