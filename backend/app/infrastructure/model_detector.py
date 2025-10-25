import io
from uuid import uuid4
from PIL import Image

from ultralytics import YOLO

from app.application.ports.detector import IModelDetector
from app.domain.entities.label import Label
from app.domain.value_objects.bbox import BBox

from app.domain.entities.model_handle import ModelHandle


class ModelDetector(IModelDetector):
    def __init__(self):
        ...

    def detect(self, model: ModelHandle, image_bytes: bytes) -> list[Label]:
        im = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        w, h = im.size
        model: YOLO = model._imp
        res = model.predict(im, verbose=False)[0]
        labels: list[Label] = []
        for box, conf, cls_idx in zip(res.boxes.xyxy, res.boxes.conf, res.boxes.cls):
            x1, y1, x2, y2 = map(float, box)
            labels.append(
                Label(
                    id=uuid4(),
                    image_id=uuid4(),  # temp; filled by service
                    class_name=res.names[int(cls_idx)],
                    confidence=float(conf),
                    bbox=BBox(
                        x=x1 / w, 
                        y=y1 / h, 
                        w=(x2 - x1) / w, 
                        h=(y2 - y1) / h
                    ),
                    source="model"
                )
            )
        return labels
