from app.domain.ports.repositories.weights import IWeightsRepository
from app.domain.entities.model_handle import ModelHandle

from app.application.ports.loader import IModelLoader
from app.application.ports.swapper import IModelSwapper
from app.application.ports.uow import UnitOfWork

from uuid import UUID


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
        except FileNotFoundError:
            raise ValueError(f"Weights was not found")
        
        new_model = self._loader.load(weights)
        self._swapper.swap(new_model)
        return new_model