from typing import Protocol
from uuid import UUID

from app.domain.entities.label import Label


class LabelRepository(Protocol):
    def add_many(self, labels: list[Label]) -> None: 
        ...
    
    def list_for_image(self, image_id: UUID) -> list[Label]: 
        ...
