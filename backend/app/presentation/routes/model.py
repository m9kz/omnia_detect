from fastapi import APIRouter, HTTPException
from uuid import UUID
from app.core.di import uow, loader, swapper, weights_repository

from app.application.use_cases.update import UpdateWeightsUseCase
from app.application.use_cases.reload import ReloadModelUseCase

router = APIRouter(prefix="/api/model", tags=["model"])

@router.post("/{model_id}/weights/upload")
def upload_weights(model_id: UUID):    
    usecase = UpdateWeightsUseCase(weights_repository, uow)
    path = usecase.execute(model_id)

    return {"ok": True, "weights": path}

@router.post("/{model_id}/weights/reload")
def reload_weights(model_id: UUID):    
    usecase = ReloadModelUseCase(weights_repository, loader, swapper, uow)
    path = usecase.execute(model_id)

    return {"ok": True, "weights": path}
