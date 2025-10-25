from fastapi import APIRouter, UploadFile, File, HTTPException
from uuid import UUID
from app.core.di import image_store, uow, detector, swapper
from app.application.use_cases.upload import UploadImageUseCase
from app.application.use_cases.detect import DetectUseCase

from app.presentation.schemas.upload_response import UploadResponse
from app.presentation.schemas.detect_response import DetectResponse
from app.presentation.schemas.detection_item import DetectionItemSchema
from app.presentation.schemas.bbox import BBoxSchema

router = APIRouter(prefix="/api/images", tags=["images"])

@router.post("", response_model=UploadResponse, status_code=201)
async def upload_image(file: UploadFile = File(...)):
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")
    
    service = UploadImageUseCase(uow, image_store)
    dto = service.execute(filename=file.filename, content=content)
    
    return UploadResponse(
        image_id=dto.image_id, 
        url=dto.url, 
        width=dto.width, 
        height=dto.height, 
        filename=dto.filename
    )

@router.post("/{image_id}/detect", response_model=DetectResponse)
async def detect_on_uploaded(image_id: UUID, file: UploadFile = File(...)):
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")
    
    service = DetectUseCase(uow, swapper, detector)
    dets = service.execute(image_id=image_id, image_bytes=content)
    
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
