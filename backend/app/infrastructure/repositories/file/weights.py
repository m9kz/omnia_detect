# app/infrastructure/file_weights_repository.py
import os
import shutil
from pathlib import Path
from app.domain.ports.repositories.weights import IWeightsRepository
from app.domain.value_objects.weights_path import WeightsPath

class FileWeightsRepository(IWeightsRepository):
    def __init__(self, root: str = "ml_models"):
        self.root = Path(root)

    def get(self) -> WeightsPath:
        p = self.root / "current.pt"
        if not p.exists():
            raise FileNotFoundError(p)
        return WeightsPath(p)

    def get_by_path(self, path: str) -> WeightsPath:
        p = Path(path)
        if not p.exists():
            raise FileNotFoundError(p)
        return WeightsPath(p)

    def add(self, new_weights: Path) -> WeightsPath:
        """
        Atomically replaces current.pt with the given file.
        """
        if not new_weights.exists():
            raise FileNotFoundError(new_weights)
        
        if new_weights.stat().st_size < 1024:  # ~1KB sanity
            raise ValueError(f"Weights file {new_weights} looks incomplete")
        
        dest = self.root / "current.pt"
        dest.parent.mkdir(parents=True, exist_ok=True)

        staged = dest.with_suffix(".staged")
        shutil.copy2(new_weights, staged)
        
        os.replace(staged, dest)
        return WeightsPath(dest)
