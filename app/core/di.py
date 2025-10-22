from app.core.config import settings
from app.infrastructure.repositories.image_store import LocalImageStore
from app.infrastructure.repositories.repo_sqlite import SqlAlchemyUnitOfWork
from app.infrastructure.detector_yolo import YoloDetector
from app.infrastructure.embedder import ClipImageEmbedder

# Adapters (infrastructure)
image_store = LocalImageStore(settings.MEDIA_DIR, base_url=settings.BASE_URL)
uow = SqlAlchemyUnitOfWork(settings.DB_URL)
detector = YoloDetector(settings.YOLO_WEIGHTS)
embedder = ClipImageEmbedder(settings.EMBEDDER_MODEL)

# Expose for imports in interface/application
__all__ = ["image_store", "uow", "detector", "embedder"]
