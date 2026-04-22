from uuid import UUID, uuid4

from app.application.dto.detection import DetectionDTO
from app.application.ports.detector import IModelDetector
from app.application.ports.swapper import IModelSwapper
from app.application.ports.uow import UnitOfWork
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
        
        for label in labels:
            label.id = uuid4()
            label.image_id = image_id
        
        with self.uow as u:
            u.labels.add_many(labels)
            u.commit()
        
        return [
            DetectionDTO(
                class_name=label.class_name, 
                confidence=label.confidence or 0.0,
                bbox=label.bbox
            ) 
            for label in labels
        ]
