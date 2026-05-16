from app.application.ports.swapper import IModelSwapper
from app.domain.entities.model_handle import ModelHandle
from app.domain.exceptions.base import NotFoundException


class RollbackModelUseCase:
    def __init__(self, swapper: IModelSwapper):
        self._swapper = swapper
    
    def execute(self) -> ModelHandle | None:
        prev = self._swapper.rollback()
        if not prev:
            raise NotFoundException("No previous model was found")
        
        return prev
