import shutil
import zipfile
from pathlib import Path
from typing import Callable
from uuid import UUID, uuid4

from ultralytics import YOLO

from app.application.ports.trainer import IModelTrainer


class ModelTrainer(IModelTrainer):
    def train(
        self,
        base_weights_path: str,
        zip_path: str,
        epochs: int = 5,
        imgsz: int = 640,
        progress_callback: Callable[[int | None, int | None, str | None], None] | None = None,
    ) -> tuple[UUID, str, str | None]:
        job_id = uuid4()
        root = Path("data/train_jobs") / str(job_id)
        root.mkdir(parents=True, exist_ok=True)

        with zipfile.ZipFile(zip_path, "r") as zf:
            zf.extractall(root)

        data_yaml = root / "data.yaml"
        if not data_yaml.exists():
            raise RuntimeError("data.yaml is missing in dataset ZIP (builder should always include it).")

        project_root = (Path("ml_models") / "runs" / "detect").resolve()
        project_root.mkdir(parents=True, exist_ok=True)
        expected_run_dir = project_root / str(job_id)
        model_impl = YOLO(base_weights_path)

        if progress_callback:
            def on_train_start(trainer) -> None:
                progress_callback(0, getattr(trainer, "epochs", epochs), "Training started")

            def on_train_epoch_end(trainer) -> None:
                current_epoch = getattr(trainer, "epoch", -1) + 1
                total_epochs = getattr(trainer, "epochs", epochs)
                progress_callback(
                    current_epoch,
                    total_epochs,
                    f"Epoch {current_epoch}/{total_epochs} completed",
                )

            def on_train_end(trainer) -> None:
                total_epochs = getattr(trainer, "epochs", epochs)
                progress_callback(
                    total_epochs,
                    total_epochs,
                    "Training finished. Saving outputs.",
                )

            model_impl.add_callback("on_train_start", on_train_start)
            model_impl.add_callback("on_train_epoch_end", on_train_epoch_end)
            model_impl.add_callback("on_train_end", on_train_end)

        model_impl.train(
            data=str(data_yaml),
            epochs=epochs,
            imgsz=imgsz,
            project=str(project_root),
            name=str(job_id),
            exist_ok=True,
        )

        trainer = getattr(model_impl, "trainer", None)
        save_dir = Path(getattr(trainer, "save_dir", expected_run_dir)).resolve()

        weights_src = save_dir / "weights" / "best.pt"
        if not weights_src.exists():
            raise RuntimeError(f"best.pt not produced in {save_dir} - check training logs.")

        results_yaml = save_dir / "results.yaml"
        results_csv = save_dir / "results.csv"
        out_dir = Path("ml_models/finetuned") / str(job_id)
        out_dir.mkdir(parents=True, exist_ok=True)
        weights_dst = out_dir / "best.pt"
        shutil.copy2(weights_src, weights_dst)

        metrics_src = results_yaml if results_yaml.exists() else results_csv if results_csv.exists() else None
        metrics_dst = out_dir / metrics_src.name if metrics_src else None
        if metrics_src and metrics_dst:
            shutil.copy2(metrics_src, metrics_dst)

        return job_id, str(weights_dst), (str(metrics_dst) if metrics_dst and metrics_dst.exists() else None)
