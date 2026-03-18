import shutil
import zipfile
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

        project_root = (Path("ml_models") / "runs" / "detect").resolve()
        project_root.mkdir(parents=True, exist_ok=True)
        expected_run_dir = project_root / job_id
        model_impl: YOLO = model._impl

        model_impl.train(
            data=str(data_yaml),
            epochs=epochs,
            imgsz=imgsz,
            project=str(project_root),
            name=job_id,
            exist_ok=True,
        )

        trainer = getattr(model_impl, "trainer", None)
        save_dir = Path(getattr(trainer, "save_dir", expected_run_dir)).resolve()

        weights_src = save_dir / "weights" / "best.pt"
        if not weights_src.exists():
            raise RuntimeError(f"best.pt not produced in {save_dir} - check training logs.")

        results_yaml = save_dir / "results.yaml"
        results_csv = save_dir / "results.csv"
        out_dir = Path("ml_models/finetuned") / job_id
        out_dir.mkdir(parents=True, exist_ok=True)
        weights_dst = out_dir / "best.pt"
        shutil.copy2(weights_src, weights_dst)

        metrics_src = results_yaml if results_yaml.exists() else results_csv if results_csv.exists() else None
        metrics_dst = out_dir / metrics_src.name if metrics_src else None
        if metrics_src and metrics_dst:
            shutil.copy2(metrics_src, metrics_dst)

        return job_id, str(weights_dst), (str(metrics_dst) if metrics_dst and metrics_dst.exists() else None)
