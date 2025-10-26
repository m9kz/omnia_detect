from fastapi import APIRouter
from fastapi_injector import Injected
from uuid import UUID

from app.application.use_cases.update import UpdateWeightsUseCase
from app.application.use_cases.reload import ReloadModelUseCase
from app.infrastructure.model_swapper import InMemoryModelSwapper

router = APIRouter(prefix="/api/model", tags=["model"])

@router.post("/{model_id}/weights/upload")
def upload_weights(
    model_id: UUID, 
    use_case: UpdateWeightsUseCase = Injected(UpdateWeightsUseCase)
):    
    path = use_case.execute(model_id)
    return {"ok": True, "weights": path}

@router.post("/weights/reload")
def reload_weights(
    use_case: ReloadModelUseCase = Injected(ReloadModelUseCase)
):    
    path = use_case.execute()
    return {"ok": True, "weights": path}

@router.get("/current")
def current_model(
    swapper: InMemoryModelSwapper = Injected(InMemoryModelSwapper)
):
    h = swapper.get_current()
    return {
        "version": str(h.version),
        "yolo_impl_id": id(getattr(h, "_impl", None)),
    }
