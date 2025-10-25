from app.core.config import settings
from app.infrastructure.repositories.image_store import LocalImageStore
from app.infrastructure.repositories.dataset_store import LocalDatasetStore
from app.infrastructure.repositories.repo_sqlite import SqlAlchemyUnitOfWork
from app.infrastructure.model_detector import ModelDetector
from app.infrastructure.embedder import ClipImageEmbedder
from app.infrastructure.trainer import ModelTrainer

from app.infrastructure.repositories.file.weights import FileWeightsRepository
from app.infrastructure.model_loader import ModelLoader
from app.infrastructure.model_detector import ModelDetector
from app.infrastructure.model_swapper import InMemoryModelSwapper

from app.domain.value_objects.weights_path import WeightsPath
from pathlib import Path

weights_repository = FileWeightsRepository()
loader = ModelLoader()
swapper = InMemoryModelSwapper()

handle = loader.load(WeightsPath(Path("ml_models/current.pt")))
swapper.init(handle)

# Adapters (infrastructure)
image_store = LocalImageStore(settings.MEDIA_DIR, base_url=settings.BASE_URL)
uow = SqlAlchemyUnitOfWork(settings.DB_URL)
detector = ModelDetector()
embedder = ClipImageEmbedder(settings.EMBEDDER_MODEL)
dataset_store = LocalDatasetStore("data/datasets")
trainer = ModelTrainer(settings.YOLO_WEIGHTS)

# Expose for imports in interface/application
__all__ = ["image_store", "uow", "detector", "embedder", "dataset_store", "trainer"]
