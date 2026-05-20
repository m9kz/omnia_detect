from uuid import UUID

from app.application.dto.download import DownloadDTO
from app.application.ports.image_store import ImageStore
from app.application.ports.uow import UnitOfWork
from app.domain.exceptions.base import NotFoundException, TransientException


class GetImageUseCase:
    def __init__(self, uow: UnitOfWork, store: ImageStore):
        self.uow = uow
        self.store = store

    async def execute(self, user_id: str, image_id: UUID) -> DownloadDTO:
        with self.uow as u:
            image = u.images.get_for_user(image_id, user_id)

        if not image:
            raise NotFoundException("Image not found")

        try:
            content, width, height = self.store.get(image.filename)
        except FileNotFoundError as exc:
            raise TransientException("Image file is missing from storage") from exc
        except OSError as exc:
            raise TransientException("Image file could not be read") from exc

        return DownloadDTO(
            image_id=image.id, 
            url=image.url,
            filename=image.filename,
            width=width, 
            height=height, 
            image_bytes=content
        )
