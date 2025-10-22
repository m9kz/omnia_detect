import zipfile, os, yaml, shutil
from pathlib import Path
from uuid import uuid4
from ultralytics import YOLO
from app.core.config import settings

class TrainService:
    def __init__(self, base_weights: str | None = None):
        self.base_weights = base_weights or settings.YOLO_WEIGHTS

    def _ensure_yaml(self, root: Path) -> Path:
        data_yaml = root / "data.yaml"
        if data_yaml.exists():
            return data_yaml

        # Try to infer folders
        train_images = None
        val_images = None
        # heuristic: datasets/{job}/images/train, images/val
        cand_train = list(root.glob("**/images/train"))
        cand_val = list(root.glob("**/images/val"))
        if cand_train:
            train_images = cand_train[0]
        if cand_val:
            val_images = cand_val[0]

        if not (train_images and val_images):
            raise RuntimeError("Could not infer dataset layout; include data.yaml or follow YOLOv8 structure.")

        data = {
            "path": str(root),
            "train": str(train_images.relative_to(root)),
            "val": str(val_images.relative_to(root)),
            # user must have labels in parallel /labels/train, /labels/val
            "names": []  # YOLO will read from labels; optional to fill
        }
        with open(data_yaml, "w", encoding="utf-8") as f:
            yaml.safe_dump(data, f)
        return data_yaml

    def train_zip(self, zip_bytes: bytes, epochs: int = 5) -> tuple[str, str]:
        job_id = str(uuid4())
        root = Path("data/datasets") / job_id
        root.mkdir(parents=True, exist_ok=True)
        zpath = root / "dataset.zip"
        zpath.write_bytes(zip_bytes)
        with zipfile.ZipFile(zpath, "r") as zf:
            zf.extractall(root)
        data_yaml = self._ensure_yaml(root)

        model = YOLO(self.base_weights)
        results = model.train(data=str(data_yaml), epochs=epochs, imgsz=640)

        out_dir = Path("models/finetuned") / job_id
        out_dir.mkdir(parents=True, exist_ok=True)
        # Ultralytics saves runs under runs/detect/train*/weights/best.pt
        # Copy best.pt to models/finetuned/<job_id>/best.pt
        weights_src = sorted(Path("runs/detect").glob("train*/weights/best.pt"))[-1]
        weights_dst = out_dir / "best.pt"
        shutil.copy2(weights_src, weights_dst)
        return job_id, str(weights_dst)
