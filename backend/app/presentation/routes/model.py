from fastapi import APIRouter, HTTPException
from uuid import UUID
from app.core.di import uow, detector

router = APIRouter(prefix="/api/model", tags=["model"])

@router.post("/{model_id}/detector/swap/")
def swap_detector_weights(model_id: UUID):    
    with uow as u:
        m = u.models.get(model_id)
        if not m:
            raise HTTPException(status_code=404, detail="Model not found")

    from app.infrastructure.detector_yolo import YoloDetector
    new_det = YoloDetector(m.best_weights_path)
    
    import app.core.di as di
    di.detector = new_det
    return {"ok": True, "weights": m.best_weights_path}
