# app/application/use_cases.py
from pathlib import Path
from uuid import UUID

from app.domain.ports.repositories.weights import IWeightsRepository
from app.application.ports.uow import UnitOfWork


class UpdateWeightsUseCase:
    def __init__(self, weights_repository: IWeightsRepository, uow: UnitOfWork):
        self.weights_repository = weights_repository
        self.uow = uow

    def execute(self, model_id: UUID) -> str:
        with self.uow as u:
            m = u.models.get(model_id)
            if not m:
                raise ValueError(f"Model was not found: {model_id}")
        
        new_path = Path(m.best_weights_path)
        weights = self.weights_repository.add(new_path)
        return str(weights.path)
