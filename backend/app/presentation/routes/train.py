from fastapi import APIRouter, Depends, Form
from fastapi_injector import Injected
from uuid import UUID

from app.application.use_cases.train import TrainModelUseCase
from app.presentation.dependencies.auth import require_authenticated_user
from app.presentation.schemas.model_item import ModelItemSchema

router = APIRouter(
    prefix="/api/train",
    tags=["train"],
    dependencies=[Depends(require_authenticated_user)],
)

@router.post("/by-dataset", response_model=ModelItemSchema)
def train_by_dataset(
    dataset_id: UUID = Form(...),
    epochs: int = Form(5),
    imgsz: int = Form(640),
    name: str | None = Form(None),
    use_case: TrainModelUseCase = Injected(TrainModelUseCase),
):
    model = use_case.execute(dataset_id=dataset_id, epochs=epochs, imgsz=imgsz, name=name)

    return ModelItemSchema(
        id=model.id,
        name=model.name,
        dataset_id=model.dataset_id,
        best_weights_path=model.best_weights_path,
        epochs=model.epochs,
        imgsz=model.imgsz,
        created_at=model.created_at,
        metrics_path=model.metrics_path,
    )
