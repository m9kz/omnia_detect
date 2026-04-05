import time
from pathlib import Path

from PIL import Image
import torch
from ultralytics import YOLO

from app.application.ports.loader import IModelLoader
from app.domain.entities.model_handle import ModelHandle
from app.domain.value_objects.weights_path import WeightsPath
from app.domain.value_objects.model_version import ModelVersion


class ModelLoader(IModelLoader):
    def __init__(self, device: str = None, warmup_size=(640, 640)):
        self.device = device
        self.warmup_size = warmup_size

    def load(self, weights: WeightsPath) -> ModelHandle:
        if self.device is None:
            self.device = "cuda" if torch.cuda.is_available() else "cpu"

        requested_weights = weights.path
        local_default = Path("ml_models") / "yolov8n.pt"
        resolved_weights = requested_weights if requested_weights.exists() else local_default

        model = YOLO(str(resolved_weights))
        model.to(self.device)

        # warmup
        dummy = Image.new("RGB", self.warmup_size)
        _ = model(dummy, verbose=False)

        # Create a domain-level model handle
        ver = ModelVersion(f"{resolved_weights.name}@{int(time.time())}")
        handle = ModelHandle(version=ver)
        handle._weights_path = str(resolved_weights)

        # attach the concrete model on the entity dynamically (kept infra-side)
        handle._impl = model  # private attachment; only infra knows about it
        return handle
