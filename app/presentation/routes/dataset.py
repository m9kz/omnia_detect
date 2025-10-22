from uuid import UUID
from pathlib import Path

from dataclasses import asdict

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse

from app.domain.services.dataset_builder import DatasetBuilderService
from app.infrastructure.zip_write import ZipDatasetWriter
from app.application.use_cases.build_dataset import BuildDatasetUseCase

from app.presentation.schemas.identity_create_response import IdentityCreateResponse
from app.presentation.schemas.dataset_item import DatasetItemSchema
from app.domain.entities.dataset_config import DatasetConfig
from app.domain.entities.raw_file import RawFile

from app.core.di import uow, dataset_store
from app.core.config import settings

router = APIRouter(prefix="/api/dataset", tags=["dataset"])

def _build_and_store_uc() -> BuildDatasetUseCase:
    return BuildDatasetUseCase(
        builder_service=DatasetBuilderService(),
        dataset_writer=ZipDatasetWriter(),
        uow=uow,
        store=dataset_store,
    )

async def to_raw_file(file: UploadFile) -> RawFile:
    return RawFile(filename=file.filename, content=await file.read())


@router.post("/build", response_model=DatasetItemSchema)
async def build_dataset(
    ratio: float = Form(..., description="Train/validation split ratio (e.g., 0.8)"),
    class_names: str = Form(..., description="Comma-separated class names"),
    image_files: list[UploadFile] = File(..., description="All image files"),
    label_files: list[UploadFile] = File(..., description="All label files")
):
    classes = [name.strip() for name in class_names.split(',') if name.strip()]
    config = DatasetConfig(ratio=ratio, class_names=classes)
  
    images = [await to_raw_file(f) for f in image_files]
    labels = [await to_raw_file(f) for f in label_files]

    use_case = _build_and_store_uc()
    artifact = use_case.execute(images, labels, config)

    download_url = f"{settings.BASE_URL}/api/dataset/{artifact.id}/download"
    return DatasetItemSchema(
        id=artifact.id,
        class_names=artifact.class_names,
        ratio=artifact.ratio,
        num_pairs=artifact.num_pairs,
        train_count=artifact.train_count,
        val_count=artifact.val_count,
        created_at=artifact.created_at,
        download_url=download_url
    )

@router.get("", response_model=list[DatasetItemSchema])
def list_datasets():
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

@router.get("/{dataset_id}/download")
def download_dataset(dataset_id: UUID):
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
