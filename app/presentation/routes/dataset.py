from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse

from app.domain.services.dataset_builder import DatasetBuilderService
from app.infrastructure.zip_write import ZipDatasetWriter
from app.application.use_cases.build_dataset import BuildDatasetUseCase

from app.presentation.schemas.identity_create_response import IdentityCreateResponse
from app.domain.entities.dataset_config import DatasetConfig
from app.domain.entities.raw_file import RawFile

router = APIRouter(prefix="/api/dataset", tags=["dataset"])

def get_build_dataset_use_case() -> BuildDatasetUseCase:
    builder_service = DatasetBuilderService()
    dataset_writer = ZipDatasetWriter()
    use_case = BuildDatasetUseCase(builder_service, dataset_writer)
    return use_case

async def to_raw_file(file: UploadFile) -> RawFile:
    return RawFile(filename=file.filename, content=await file.read())


@router.post("/build", response_model=IdentityCreateResponse)
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

    use_case = get_build_dataset_use_case()
    zip_buffer = use_case.execute(images, labels, config)

    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={
            "Content-Disposition": "attachment; filename=yolo_dataset.zip"
        }
    )

@router.get("/")
def read_root():
    return {"ok": True}
