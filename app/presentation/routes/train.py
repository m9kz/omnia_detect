from fastapi import APIRouter, Form
from uuid import UUID
from app.core.di import uow, trainer

from app.application.use_cases.train import TrainModelUseCase
from app.presentation.schemas.model_item import ModelItemSchema

router = APIRouter(prefix="/api/train", tags=["train"])

@router.post("/by-dataset", response_model=ModelItemSchema)
def train_by_dataset(
    dataset_id: UUID, 
    epochs: int = Form(5), 
    imgsz: int = Form(640)
):
    use_case = TrainModelUseCase(trainer, uow)
    model = use_case.execute(dataset_id=dataset_id, epochs=epochs, imgsz=imgsz)
    
    return ModelItemSchema(
        id=model.id,
        dataset_id=model.dataset_id,
        best_weights_path=model.best_weights_path,
        epochs=model.epochs,
        imgsz=model.imgsz,
        created_at=model.created_at,
        metrics_path=model.metrics_path
    )
