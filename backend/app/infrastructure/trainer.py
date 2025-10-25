import zipfile, shutil
from pathlib import Path
from uuid import uuid4
from ultralytics import YOLO

from app.application.ports.trainer import IModelTrainer
from app.domain.entities.model_handle import ModelHandle


class ModelTrainer(IModelTrainer):
    def __init__(self, base_weights: str):
        self.base_weights = base_weights

    def train(self, model: ModelHandle, zip_path: str, epochs: int = 5, imgsz: int = 640):
        job_id = str(uuid4())
        root = Path("data/train_jobs") / job_id
        root.mkdir(parents=True, exist_ok=True)

        with zipfile.ZipFile(zip_path, "r") as zf:
            zf.extractall(root)
        
        data_yaml = root / "data.yaml"
        if not data_yaml.exists():
            raise RuntimeError("data.yaml is missing in dataset ZIP (builder should always include it).")

        project_dir = Path("ml_models/runs/detect") / job_id
        model: YOLO = model._impl
        
        model.train(
            data=str(data_yaml),
            epochs=epochs,
            imgsz=imgsz,
            project=str(project_dir.parent),  # runs/detect
            name=job_id,                      # runs/detect/<job_id>
            exist_ok=True
        )

        weights_src = project_dir / "weights" / "best.pt"
        if not weights_src.exists():
            raise RuntimeError("best.pt not produced—check training logs.")

        results_yaml = project_dir / "results.yaml"
        out_dir = Path("ml_models/finetuned") / job_id
        out_dir.mkdir(parents=True, exist_ok=True)
        weights_dst = out_dir / "best.pt"
        shutil.copy2(weights_src, weights_dst)

        metrics_dst = out_dir / "results.yaml"
        if results_yaml.exists():
            shutil.copy2(results_yaml, metrics_dst)

        return job_id, str(weights_dst), (str(metrics_dst) if metrics_dst.exists() else None)
