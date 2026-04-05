import shutil
from pathlib import Path
from uuid import UUID

from app.application.use_cases.build_dataset import BuildDatasetUseCase
from app.core.config import settings
from app.domain.entities.dataset_config import DatasetConfig
from app.domain.entities.raw_file import RawFile
from app.infrastructure.repositories.repo_sqlite import SqlAlchemyUnitOfWork
from app.presentation.schemas.dataset_detail import DatasetDetailSchema
from app.presentation.schemas.dataset_item import DatasetItemSchema
from fastapi import APIRouter, File, Form, HTTPException, Response, UploadFile
from fastapi.responses import StreamingResponse
from fastapi_injector import Injected

router = APIRouter(prefix="/api/dataset", tags=["dataset"])


def _remove_tree(path: Path) -> None:
    if path.exists():
        shutil.rmtree(path, ignore_errors=True)

async def to_raw_file(file: UploadFile) -> RawFile:
    return RawFile(filename=file.filename, content=await file.read())

@router.post("/build", response_model=DatasetItemSchema)
async def build_dataset(
    ratio: float = Form(..., description="Train/validation split ratio (e.g., 0.8)"),
    class_names: str = Form(..., description="Comma-separated class names"),
    image_files: list[UploadFile] = File(..., description="All image files"),
    label_files: list[UploadFile] = File(..., description="All label files"),
    use_case: BuildDatasetUseCase = Injected(BuildDatasetUseCase),
):
    classes = [name.strip() for name in class_names.split(',') if name.strip()]
    config = DatasetConfig(ratio=ratio, class_names=classes)

    images = [await to_raw_file(f) for f in image_files]
    labels = [await to_raw_file(f) for f in label_files]

    try:
        artifact = use_case.execute(images=images, labels=labels, config=config)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    download_url = f"{settings.BASE_URL}/api/dataset/{artifact.id}/download"
    return DatasetItemSchema(
        id=artifact.id,
        class_names=artifact.class_names,
        ratio=artifact.ratio,
        num_pairs=artifact.num_pairs,
        train_count=artifact.train_count,
        val_count=artifact.val_count,
        created_at=artifact.created_at,
        download_url=download_url,
    )

@router.get("", response_model=list[DatasetItemSchema])
def list_datasets(
    uow: SqlAlchemyUnitOfWork = Injected(SqlAlchemyUnitOfWork)
):
    items: list[DatasetItemSchema] = []
    with uow as u:
        for art in u.datasets.list(limit=50):
            items.append(
                DatasetItemSchema(
                    id=art.id,
                    class_names=art.class_names,
                    ratio=art.ratio,
                    num_pairs=art.num_pairs,
                    train_count=art.train_count,
                    val_count=art.val_count,
                    created_at=art.created_at,
                    download_url=f"{settings.BASE_URL}/api/dataset/{art.id}/download"
                )
            )
    return items


@router.get("/{dataset_id}", response_model=DatasetDetailSchema)
def get_dataset(
    dataset_id: UUID,
    uow: SqlAlchemyUnitOfWork = Injected(SqlAlchemyUnitOfWork)
):
    with uow as u:
        art = u.datasets.get(dataset_id)
        if not art:
            raise HTTPException(status_code=404, detail="Dataset not found")

    zip_path = Path(art.zip_relpath)

    return DatasetDetailSchema(
        id=art.id,
        class_names=art.class_names,
        ratio=art.ratio,
        num_pairs=art.num_pairs,
        train_count=art.train_count,
        val_count=art.val_count,
        created_at=art.created_at,
        download_url=f"{settings.BASE_URL}/api/dataset/{art.id}/download",
        zip_relpath=art.zip_relpath,
        zip_exists=zip_path.exists(),
    )


@router.delete("/{dataset_id}", status_code=204)
def delete_dataset(
    dataset_id: UUID,
    uow: SqlAlchemyUnitOfWork = Injected(SqlAlchemyUnitOfWork),
):
    with uow as u:
        if next(u.models.list_for_dataset(dataset_id), None):
            raise HTTPException(
                status_code=409,
                detail="Dataset has trained models. Delete related models first.",
            )

        art = u.datasets.delete(dataset_id)
        if not art:
            raise HTTPException(status_code=404, detail="Dataset not found")

        u.commit()

    _remove_tree(Path(art.zip_relpath).parent)
    return Response(status_code=204)

@router.get("/{dataset_id}/download")
def download_dataset(
    dataset_id: UUID,
    uow: SqlAlchemyUnitOfWork = Injected(SqlAlchemyUnitOfWork)
):
    with uow as up:
        art = up.datasets.get(dataset_id)
        if not art:
            raise HTTPException(status_code=404, detail="Dataset not found")
        
        zpath = Path(art.zip_relpath)
        if not zpath.exists():
            raise HTTPException(status_code=410, detail="Dataset file missing")
        
        return StreamingResponse(
            zpath.open("rb"),
            media_type="application/zip",
            headers={"Content-Disposition": f"attachment; filename=dataset_{dataset_id}.zip"}
        )

@router.get("/")
def read_root():
    return {"ok": True}
