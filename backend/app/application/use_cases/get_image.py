from uuid import uuid4, UUID
from datetime import datetime, timezone
from app.application.ports.image_store import ImageStore
from app.application.ports.uow import UnitOfWork

from app.application.dto.download import DownloadDTO
from app.domain.entities.image_item import ImageItem


class GetImageUseCase:
    def __init__(self, uow: UnitOfWork, store: ImageStore):
        self.uow = uow
        self.store = store

    async def execute(self, image_id: UUID) -> DownloadDTO:
        with self.uow as u:
            image = u.images.get(image_id)
        
        content, width, height = self.store.get(
            image.filename, 
        )

        return DownloadDTO(
            image_id=image.id, 
            url=image.url, 
            width=width, 
            height=height, 
            image_bytes=content
        )
