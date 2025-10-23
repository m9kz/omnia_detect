from fastapi import APIRouter, UploadFile, File, Form
from typing import List
from uuid import UUID
from app.core.di import uow, embedder, detector

from app.application.use_cases.identity import IdentityService
from app.application.use_cases.match import MatchService

from app.presentation.schemas.identity_create_response import IdentityCreateResponse
from app.presentation.schemas.match_response import MatchResponse
from app.presentation.schemas.match_detection_item import MatchDetectionItem
from app.presentation.schemas.bbox import BBoxSchema

router = APIRouter(prefix="/api/identity", tags=["identity"])

@router.post("/add", response_model=IdentityCreateResponse)
async def add_reference(
    name: str = Form(...),
    files: List[UploadFile] = File(...)
):
    imgs = [await f.read() for f in files]
    svc = IdentityService(uow, embedder)
    count = svc.add_reference_images(identity_name=name, images=imgs)
    return IdentityCreateResponse(identity_name=name, added_refs=count)

@router.post("/match/{image_id}", response_model=MatchResponse)
async def match_image(image_id: UUID, file: UploadFile = File(...)):
    content = await file.read()
    svc = MatchService(uow, detector, embedder)
    results = svc.match_in_image(image_id=image_id, image_bytes=content)
    
    return MatchResponse(
        image_id=image_id,
        matches=[
            MatchDetectionItem(
                class_name=r.detection.class_name,
                confidence=r.detection.confidence or 0.0,
                bbox=BBoxSchema(**r.detection.bbox.__dict__),
                identity_name=r.matched_identity_name,
                similarity=r.similarity
            )
            for r in results
        ]
    )
