from app.domain.entities.model_handle import ModelHandle
from app.application.ports.swapper import IModelSwapper


class RollbackModelUseCase:
    def __init__(self, swapper: IModelSwapper):
        self._swapper = swapper
    
    def execute(self) -> ModelHandle | None:
        prev = self._swapper.rollback()
        if not prev:
            raise ValueError("No model was found")
        
        return prev