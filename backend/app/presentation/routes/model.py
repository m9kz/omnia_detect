from pathlib import Path
import shutil

from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import FileResponse
from fastapi_injector import Injected
from uuid import UUID

from app.application.use_cases.update import UpdateWeightsUseCase
from app.application.use_cases.reload import ReloadModelUseCase
from app.infrastructure.model_swapper import InMemoryModelSwapper
from app.infrastructure.repositories.repo_sqlite import SqlAlchemyUnitOfWork
from app.presentation.schemas.model_item import ModelItemSchema
from app.presentation.schemas.model_detail import ModelDetailSchema
from app.core.config import settings

router = APIRouter(prefix="/api/model", tags=["model"])

RUN_ARTIFACT_NAMES = [
    "results.csv",
    "results.png",
    "confusion_matrix.png",
    "confusion_matrix_normalized.png",
    "labels.jpg",
    "BoxPR_curve.png",
    "BoxP_curve.png",
    "BoxR_curve.png",
    "BoxF1_curve.png",
    "val_batch0_pred.jpg",
    "val_batch1_pred.jpg",
]

PREVIEW_ARTIFACT_NAMES = [
    "results.png",
    "confusion_matrix.png",
    "confusion_matrix_normalized.png",
    "labels.jpg",
    "BoxPR_curve.png",
    "BoxP_curve.png",
    "BoxR_curve.png",
    "BoxF1_curve.png",
    "val_batch0_pred.jpg",
    "val_batch1_pred.jpg",
]


def _run_dir_for(model_id: UUID) -> Path:
    return Path("ml_models/runs/detect") / str(model_id)


def _finetuned_dir_for(model_id: UUID) -> Path:
    return Path("ml_models/finetuned") / str(model_id)


def _train_job_dir_for(model_id: UUID) -> Path:
    return Path("data/train_jobs") / str(model_id)


def _artifact_paths(model_id: UUID, model) -> dict[str, Path]:
    run_dir = _run_dir_for(model_id)
    paths: dict[str, Path] = {}

    for name in RUN_ARTIFACT_NAMES:
        candidate = run_dir / name
        if candidate.exists():
            paths[name] = candidate

    if model.metrics_path:
        metrics_path = Path(model.metrics_path)
        if metrics_path.exists():
            paths[metrics_path.name] = metrics_path

    return paths


def _to_model_item(model) -> ModelItemSchema:
    return ModelItemSchema(
        id=model.id,
        dataset_id=model.dataset_id,
        best_weights_path=model.best_weights_path,
        epochs=model.epochs,
        imgsz=model.imgsz,
        created_at=model.created_at,
        metrics_path=model.metrics_path,
    )


def _is_active_model(model_id: UUID, swapper: InMemoryModelSwapper) -> bool:
    handle = swapper.get_current()
    active_model_id = getattr(handle, "_model_id", None)
    return active_model_id == str(model_id)


def _remove_path(path: Path) -> None:
    if path.is_dir():
        shutil.rmtree(path, ignore_errors=True)
        return

    if path.exists():
        path.unlink(missing_ok=True)


@router.get("", response_model=list[ModelItemSchema])
def list_models(
    uow: SqlAlchemyUnitOfWork = Injected(SqlAlchemyUnitOfWork)
):
    items: list[ModelItemSchema] = []
    with uow as u:
        for model in u.models.list(limit=50):
            items.append(_to_model_item(model))
    return items


@router.get("/current")
def current_model(
    swapper: InMemoryModelSwapper = Injected(InMemoryModelSwapper)
):
    h = swapper.get_current()
    return {
        "version": str(h.version),
        "model_id": getattr(h, "_model_id", None),
        "weights_path": getattr(h, "_weights_path", None),
        "yolo_impl_id": id(getattr(h, "_impl", None)),
    }


@router.get("/{model_id}", response_model=ModelDetailSchema)
def get_model_detail(
    model_id: UUID,
    uow: SqlAlchemyUnitOfWork = Injected(SqlAlchemyUnitOfWork),
    swapper: InMemoryModelSwapper = Injected(InMemoryModelSwapper),
):
    with uow as u:
        model = u.models.get(model_id)
        if not model:
            raise HTTPException(status_code=404, detail=f"Model was not found: {model_id}")

    artifact_paths = _artifact_paths(model_id, model)
    artifact_urls = {
        name: f"{settings.BASE_URL}/api/model/{model_id}/artifacts/{name}"
        for name in artifact_paths
    }
    preview_urls = {
        name: artifact_urls[name]
        for name in PREVIEW_ARTIFACT_NAMES
        if name in artifact_urls
    }

    return ModelDetailSchema(
        id=model.id,
        dataset_id=model.dataset_id,
        best_weights_path=model.best_weights_path,
        epochs=model.epochs,
        imgsz=model.imgsz,
        created_at=model.created_at,
        metrics_path=model.metrics_path,
        is_active=_is_active_model(model_id, swapper),
        download_weights_url=f"{settings.BASE_URL}/api/model/{model_id}/weights/download",
        artifact_urls=artifact_urls,
        preview_urls=preview_urls,
    )


@router.post("/{model_id}/activate")
def activate_model(
    model_id: UUID,
    update_use_case: UpdateWeightsUseCase = Injected(UpdateWeightsUseCase),
    reload_use_case: ReloadModelUseCase = Injected(ReloadModelUseCase),
    uow: SqlAlchemyUnitOfWork = Injected(SqlAlchemyUnitOfWork),
):
    with uow as u:
        model = u.models.get(model_id)
        if not model:
            raise HTTPException(status_code=404, detail=f"Model was not found: {model_id}")

    try:
        update_use_case.execute(model_id)
        handle = reload_use_case.execute()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    handle._model_id = str(model.id)
    handle._weights_path = model.best_weights_path

    return {
        "model": _to_model_item(model),
        "runtime": {
            "version": str(handle.version),
            "model_id": str(model.id),
            "weights_path": model.best_weights_path,
            "yolo_impl_id": id(getattr(handle, "_impl", None)),
        },
    }


@router.delete("/{model_id}", status_code=204)
def delete_model(
    model_id: UUID,
    uow: SqlAlchemyUnitOfWork = Injected(SqlAlchemyUnitOfWork),
    swapper: InMemoryModelSwapper = Injected(InMemoryModelSwapper),
):
    if _is_active_model(model_id, swapper):
        raise HTTPException(
            status_code=409,
            detail="Model is currently active. Activate another model before deleting it.",
        )

    with uow as u:
        model = u.models.delete(model_id)
        if not model:
            raise HTTPException(status_code=404, detail=f"Model was not found: {model_id}")

        u.commit()

    cleanup_paths = [
        _finetuned_dir_for(model_id),
        _run_dir_for(model_id),
        _train_job_dir_for(model_id),
    ]

    weights_path = Path(model.best_weights_path)
    if weights_path.parent != _finetuned_dir_for(model_id):
        cleanup_paths.append(weights_path)

    if model.metrics_path:
        metrics_path = Path(model.metrics_path)
        if metrics_path.parent != _finetuned_dir_for(model_id):
            cleanup_paths.append(metrics_path)

    for path in cleanup_paths:
        _remove_path(path)

    return Response(status_code=204)


@router.get("/{model_id}/weights/download")
def download_model_weights(
    model_id: UUID,
    uow: SqlAlchemyUnitOfWork = Injected(SqlAlchemyUnitOfWork),
):
    with uow as u:
        model = u.models.get(model_id)
        if not model:
            raise HTTPException(status_code=404, detail=f"Model was not found: {model_id}")

    weights_path = Path(model.best_weights_path)
    if not weights_path.exists():
        raise HTTPException(status_code=410, detail="Weights file missing")

    return FileResponse(
        weights_path,
        media_type="application/octet-stream",
        filename=f"model_{model_id}_best.pt",
    )


@router.get("/{model_id}/artifacts/{artifact_name}")
def download_model_artifact(
    model_id: UUID,
    artifact_name: str,
    uow: SqlAlchemyUnitOfWork = Injected(SqlAlchemyUnitOfWork),
):
    with uow as u:
        model = u.models.get(model_id)
        if not model:
            raise HTTPException(status_code=404, detail=f"Model was not found: {model_id}")

    artifact_paths = _artifact_paths(model_id, model)
    artifact_path = artifact_paths.get(artifact_name)
    if not artifact_path:
        raise HTTPException(status_code=404, detail=f"Artifact was not found: {artifact_name}")

    return FileResponse(artifact_path)

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
