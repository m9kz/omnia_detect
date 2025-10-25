from uuid import uuid4, UUID

from app.application.ports.uow import UnitOfWork
from app.application.ports.detector import IModelDetector
from app.application.ports.swapper import IModelSwapper

from app.application.dto.detection import DetectionDTO
from app.domain.entities.label import Label


class DetectUseCase:
    def __init__(
        self, 
        uow: UnitOfWork, 
        swapper: IModelSwapper, 
        detector: IModelDetector
    ):
        self.uow = uow
        self.swapper = swapper
        self.detector = detector

    def execute(self, image_id: UUID, image_bytes: bytes) -> list[DetectionDTO]:
        model = self.swapper.get_current()
        labels: list[Label] = self.detector.detect(model, image_bytes)
        
        for l in labels:
            l.id = uuid4()
            l.image_id = image_id
        
        with self.uow as u:
            u.labels.add_many(labels)
            u.commit()
        
        return [
            DetectionDTO(
                class_name=l.class_name, 
                confidence=l.confidence or 0.0,
                bbox=l.bbox
            ) 
            for l in labels
        ]
