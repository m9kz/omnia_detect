from uuid import UUID

from app.application.dto.download import DownloadDTO
from app.application.ports.image_store import ImageStore
from app.application.ports.uow import UnitOfWork


class GetImageUseCase:
    def __init__(self, uow: UnitOfWork, store: ImageStore):
        self.uow = uow
        self.store = store

    async def execute(self, image_id: UUID) -> DownloadDTO | None:
        with self.uow as u:
            image = u.images.get(image_id)

        if not image:
            return None

        content, width, height = self.store.get(
            image.filename, 
        )

        return DownloadDTO(
            image_id=image.id, 
            url=image.url,
            filename=image.filename,
            width=width, 
            height=height, 
            image_bytes=content
        )
