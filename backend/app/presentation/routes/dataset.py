import shutil
from pathlib import Path
from uuid import UUID

from app.application.use_cases.build_dataset import BuildDatasetUseCase
from app.application.use_cases.rename_dataset import RenameDatasetUseCase
from app.core.config import settings
from app.domain.entities.dataset_config import DatasetConfig
from app.domain.entities.raw_file import RawFile
from app.domain.entities.user import User
from app.domain.exceptions.base import ConflictException, NotFoundException, TransientException
from app.infrastructure.repositories.repo_sqlite import SqlAlchemyUnitOfWork
from app.presentation.dependencies.auth import require_authenticated_user
from app.presentation.schemas.dataset_detail import DatasetDetailSchema
from app.presentation.schemas.dataset_item import DatasetItemSchema
from app.presentation.schemas.resource_name_update import ResourceNameUpdateSchema
from fastapi import APIRouter, Depends, File, Form, Response, UploadFile
from fastapi.responses import StreamingResponse
from fastapi_injector import Injected

router = APIRouter(
    prefix="/api/dataset",
    tags=["dataset"],
    dependencies=[Depends(require_authenticated_user)],
)


def _remove_tree(path: Path) -> None:
    if path.exists():
        shutil.rmtree(path, ignore_errors=True)

async def to_raw_file(file: UploadFile) -> RawFile:
    return RawFile(filename=file.filename, content=await file.read())

@router.post("/build", response_model=DatasetItemSchema)
async def build_dataset(
    name: str | None = Form(None, description="Optional dataset name"),
    ratio: float = Form(..., description="Train/validation split ratio (e.g., 0.8)"),
    class_names: str = Form(..., description="Comma-separated class names"),
    image_files: list[UploadFile] = File(..., description="All image files"),
    label_files: list[UploadFile] = File(..., description="All label files"),
    current_user: User = Depends(require_authenticated_user),
    use_case: BuildDatasetUseCase = Injected(BuildDatasetUseCase),
):
    classes = [name.strip() for name in class_names.split(',') if name.strip()]
    config = DatasetConfig(ratio=ratio, class_names=classes)

    images = [await to_raw_file(f) for f in image_files]
    labels = [await to_raw_file(f) for f in label_files]

    artifact = use_case.execute(
        user_id=current_user.id,
        images=images,
        labels=labels,
        config=config,
        name=name,
    )

    download_url = f"{settings.BASE_URL}/api/dataset/{artifact.id}/download"
    return DatasetItemSchema(
        id=artifact.id,
        name=artifact.name,
        class_names=artifact.class_names,
        ratio=artifact.ratio,
        num_pairs=artifact.num_pairs,
        train_count=artifact.train_count,
        val_count=artifact.val_count,
        size_bytes=artifact.size_bytes,
        created_at=artifact.created_at,
        download_url=download_url,
    )

@router.get("", response_model=list[DatasetItemSchema])
def list_datasets(
    current_user: User = Depends(require_authenticated_user),
    uow: SqlAlchemyUnitOfWork = Injected(SqlAlchemyUnitOfWork)
):
    items: list[DatasetItemSchema] = []
    with uow as u:
        for art in u.datasets.list_for_user(current_user.id, limit=50):
            items.append(
                DatasetItemSchema(
                    id=art.id,
                    name=art.name,
                    class_names=art.class_names,
                    ratio=art.ratio,
                    num_pairs=art.num_pairs,
                    train_count=art.train_count,
                    val_count=art.val_count,
                    size_bytes=art.size_bytes,
                    created_at=art.created_at,
                    download_url=f"{settings.BASE_URL}/api/dataset/{art.id}/download"
                )
            )
    return items


@router.get("/{dataset_id}", response_model=DatasetDetailSchema)
def get_dataset(
    dataset_id: UUID,
    current_user: User = Depends(require_authenticated_user),
    uow: SqlAlchemyUnitOfWork = Injected(SqlAlchemyUnitOfWork)
):
    with uow as u:
        art = u.datasets.get_for_user(dataset_id, current_user.id)
        if not art:
            raise NotFoundException("Dataset not found")

    zip_path = Path(art.zip_relpath)

    return DatasetDetailSchema(
        id=art.id,
        name=art.name,
        class_names=art.class_names,
        ratio=art.ratio,
        num_pairs=art.num_pairs,
        train_count=art.train_count,
        val_count=art.val_count,
        size_bytes=art.size_bytes,
        created_at=art.created_at,
        download_url=f"{settings.BASE_URL}/api/dataset/{art.id}/download",
        zip_relpath=art.zip_relpath,
        zip_exists=zip_path.exists(),
    )


@router.patch("/{dataset_id}", response_model=DatasetDetailSchema)
def rename_dataset(
    dataset_id: UUID,
    payload: ResourceNameUpdateSchema,
    current_user: User = Depends(require_authenticated_user),
    use_case: RenameDatasetUseCase = Injected(RenameDatasetUseCase),
):
    art = use_case.execute(current_user.id, dataset_id, payload.name)

    zip_path = Path(art.zip_relpath)

    return DatasetDetailSchema(
        id=art.id,
        name=art.name,
        class_names=art.class_names,
        ratio=art.ratio,
        num_pairs=art.num_pairs,
        train_count=art.train_count,
        val_count=art.val_count,
        size_bytes=art.size_bytes,
        created_at=art.created_at,
        download_url=f"{settings.BASE_URL}/api/dataset/{art.id}/download",
        zip_relpath=art.zip_relpath,
        zip_exists=zip_path.exists(),
    )


@router.delete("/{dataset_id}", status_code=204)
def delete_dataset(
    dataset_id: UUID,
    current_user: User = Depends(require_authenticated_user),
    uow: SqlAlchemyUnitOfWork = Injected(SqlAlchemyUnitOfWork),
):
    with uow as u:
        if next(u.jobs.list_pending_for_dataset_for_user(dataset_id, current_user.id), None):
            raise ConflictException(
                "Dataset has pending training jobs. Wait for them to finish before deleting it."
            )

        if next(u.models.list_for_dataset_for_user(dataset_id, current_user.id), None):
            raise ConflictException(
                "Dataset has trained models. Delete related models first."
            )

        art = u.datasets.delete_for_user(dataset_id, current_user.id)
        if not art:
            raise NotFoundException("Dataset not found")

        u.commit()

    _remove_tree(Path(art.zip_relpath).parent)
    return Response(status_code=204)

@router.get("/{dataset_id}/download")
def download_dataset(
    dataset_id: UUID,
    current_user: User = Depends(require_authenticated_user),
    uow: SqlAlchemyUnitOfWork = Injected(SqlAlchemyUnitOfWork)
):
    with uow as up:
        art = up.datasets.get_for_user(dataset_id, current_user.id)
        if not art:
            raise NotFoundException("Dataset not found")
        
        zpath = Path(art.zip_relpath)
        if not zpath.exists():
            raise TransientException("Dataset file is missing from storage")
        
        return StreamingResponse(
            zpath.open("rb"),
            media_type="application/zip",
            headers={"Content-Disposition": f"attachment; filename=dataset_{dataset_id}.zip"}
        )

@router.get("/")
def read_root():
    return {"ok": True}
