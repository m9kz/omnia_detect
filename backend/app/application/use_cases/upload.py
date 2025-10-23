from uuid import uuid4
from datetime import datetime, timezone
from app.application.ports.image_store import ImageStore
from app.application.ports.uow import UnitOfWork

from app.application.dto.upload import UploadDTO
from app.domain.entities.image_item import ImageItem


class UploadService:
    def __init__(self, uow: UnitOfWork, store: ImageStore):
        self.uow = uow
        self.store = store

    def execute(self, filename: str, content: bytes) -> UploadDTO:
        url, width, height = self.store.save(
            filename, 
            content
        )
        current_time = datetime.now(
            timezone.utc
        )
        image = ImageItem(
            id=uuid4(), 
            url=url, 
            width=width, 
            height=height, 
            filename=filename, 
            uploaded_at=current_time
        )
        
        with self.uow as u:
            u.images.add(image)
            u.commit()
        
        return UploadDTO(
            image_id=image.id, 
            url=image.url, 
            width=width, 
            height=height, 
            filename=filename
        )
