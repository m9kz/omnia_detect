from uuid import UUID

from app.application.ports.uow import UnitOfWork
from app.domain.entities.model_artifact import ModelArtifact
from app.domain.exceptions.base import NotFoundException


class RenameModelUseCase:
    def __init__(self, uow: UnitOfWork):
        self.uow = uow

    def execute(self, user_id: str, model_id: UUID, name: str) -> ModelArtifact:
        with self.uow as u:
            model = u.models.get_for_user(model_id, user_id)
            if not model:
                raise NotFoundException("Model not found")

            model.rename(name)
            u.models.update(model)
            u.commit()

            return model
