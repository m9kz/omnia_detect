from datetime import datetime, timezone
from uuid import uuid4

from app.application.dto.upload import UploadDTO
from app.application.ports.image_store import ImageStore
from app.application.ports.uow import UnitOfWork
from app.core.config import settings
from app.domain.entities.image_item import ImageItem


class UploadImageUseCase:
    def __init__(self, uow: UnitOfWork, store: ImageStore):
        self.uow = uow
        self.store = store

    def execute(self, filename: str, content: bytes) -> UploadDTO:
        width, height = self.store.save(
            filename, 
            content
        )
        
        current_time = datetime.now(
            timezone.utc
        )

        image_id = uuid4()
        image_url = f"{settings.BASE_URL}/api/images/{image_id}/content"
        image = ImageItem(
            id=image_id, 
            url=image_url, 
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
