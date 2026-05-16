from app.application.ports.loader import IModelLoader
from app.application.ports.swapper import IModelSwapper
from app.application.ports.uow import UnitOfWork
from app.domain.entities.model_handle import ModelHandle
from app.domain.exceptions.base import TransientException
from app.domain.ports.repositories.weights import IWeightsRepository


class ReloadModelUseCase:
    def __init__(
        self, 
        weights_repo: IWeightsRepository, 
        loader: IModelLoader, 
        swapper: IModelSwapper,
        uow: UnitOfWork
    ):
        self._weights_repo = weights_repo
        self._loader = loader
        self._swapper = swapper
        self.uow = uow

    def execute(self) -> ModelHandle:
        try:
            weights = self._weights_repo.get()
        except FileNotFoundError as exc:
            raise TransientException("Weights file was not found") from exc
        
        new_model = self._loader.load(weights)
        self._swapper.swap(new_model)
        return new_model
