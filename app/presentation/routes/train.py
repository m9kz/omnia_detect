from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from app.application.use_cases.train import TrainService

router = APIRouter(prefix="/api/train", tags=["train"])

@router.post("/yolo")
async def train_yolo(zipfile: UploadFile = File(...), epochs: int = Form(5)):
    content = await zipfile.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty zip")
    
    svc = TrainService()
    job_id, best_path = svc.train_zip(content, epochs=epochs)
    return {"job_id": job_id, "weights_path": best_path}
