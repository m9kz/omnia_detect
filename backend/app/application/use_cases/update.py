# app/application/use_cases.py
from pathlib import Path
from uuid import UUID

from app.application.ports.uow import UnitOfWork
from app.domain.exceptions.base import NotFoundException, TransientException, ValidationException
from app.domain.ports.repositories.weights import IWeightsRepository


class UpdateWeightsUseCase:
    def __init__(self, weights_repository: IWeightsRepository, uow: UnitOfWork):
        self.weights_repository = weights_repository
        self.uow = uow

    def execute(self, model_id: UUID) -> str:
        with self.uow as u:
            m = u.models.get(model_id)
            if not m:
                raise NotFoundException(f"Model was not found: {model_id}")
        
        new_path = Path(m.best_weights_path)
        try:
            weights = self.weights_repository.add(new_path)
        except FileNotFoundError as exc:
            raise TransientException("Model weights file is missing") from exc
        except OSError as exc:
            raise TransientException("Model weights file could not be activated") from exc
        except ValueError as exc:
            raise ValidationException(str(exc)) from exc

        return str(weights.path)
