from uuid import uuid4, UUID

from app.application.ports.uow import UnitOfWork
from app.application.ports.detector import Detector

from app.application.dto.detection import DetectionDTO
from app.domain.entities.label import Label


class DetectService:
    def __init__(self, uow: UnitOfWork, detector: Detector):
        self.uow = uow
        self.detector = detector

    def run_on_bytes(self, image_id: UUID, image_bytes: bytes) -> list[DetectionDTO]:
        labels: list[Label] = self.detector.detect(image_bytes)
        
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
