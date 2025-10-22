from pathlib import Path
from uuid import UUID

from app.application.ports.dataset_store import DatasetStore


class LocalDatasetStore(DatasetStore):
    def __init__(self, root: str = "data/datasets"):
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)

    def save(self, dataset_id: UUID, zip_bytes: bytes) -> str:
        ds_dir = self.root / str(dataset_id)
        ds_dir.mkdir(parents=True, exist_ok=True)
        zpath = ds_dir / "dataset.zip"
        zpath.write_bytes(zip_bytes)
        return str(zpath.as_posix())
