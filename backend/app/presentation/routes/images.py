import mimetypes
from io import BytesIO

from fastapi import APIRouter, Depends, UploadFile, File
from fastapi.responses import StreamingResponse
from fastapi_injector import Injected
from uuid import UUID

from app.application.use_cases.upload import UploadImageUseCase
from app.application.use_cases.detect import DetectUseCase
from app.application.use_cases.get_image import GetImageUseCase
from app.domain.entities.user import User
from app.domain.exceptions.base import ValidationException
from app.presentation.dependencies.auth import require_authenticated_user

from app.presentation.schemas.upload_response import UploadResponse
from app.presentation.schemas.detect_response import DetectResponse
from app.presentation.schemas.detection_item import DetectionItemSchema
from app.presentation.schemas.bbox import BBoxSchema

router = APIRouter(
    prefix="/api/images",
    tags=["images"],
    dependencies=[Depends(require_authenticated_user)],
)

@router.post("", response_model=UploadResponse, status_code=201)
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(require_authenticated_user),
    use_case: UploadImageUseCase = Injected(UploadImageUseCase)
):
    content = await file.read()
    if not content:
        raise ValidationException("Empty file")
    
    dto = use_case.execute(
        user_id=current_user.id,
        filename=file.filename,
        content=content,
    )
    
    return UploadResponse(
        image_id=dto.image_id, 
        url=dto.url, 
        width=dto.width, 
        height=dto.height, 
        filename=dto.filename
    )

@router.post("/{image_id}/detect", response_model=DetectResponse)
async def detect_on_uploaded(
    image_id: UUID,
    current_user: User = Depends(require_authenticated_user),
    use_case: DetectUseCase = Injected(DetectUseCase),
    get_image_uc: GetImageUseCase = Injected(GetImageUseCase)
):
    download_dto = await get_image_uc.execute(current_user.id, image_id)
    
    dets = use_case.execute(
        image_id=image_id, image_bytes=download_dto.image_bytes
    )
    
    return DetectResponse(
        image_id=image_id,
        detections=[
            DetectionItemSchema(
                class_name=d.class_name, 
                confidence=d.confidence,
                bbox=BBoxSchema(**d.bbox.__dict__)
            ) 
            for d in dets
        ]
    )


@router.get("/{image_id}/content")
async def get_image_content(
    image_id: UUID,
    current_user: User = Depends(require_authenticated_user),
    use_case: GetImageUseCase = Injected(GetImageUseCase),
):
    download_dto = await use_case.execute(current_user.id, image_id)

    media_type = mimetypes.guess_type(download_dto.filename)[0] or "application/octet-stream"

    return StreamingResponse(
        BytesIO(download_dto.image_bytes),
        media_type=media_type,
        headers={
            "Content-Disposition": f'inline; filename="{download_dto.filename}"',
            "Cache-Control": "private, max-age=300",
        },
    )
