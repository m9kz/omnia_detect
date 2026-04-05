from datetime import datetime
from typing import Callable
from uuid import UUID

from app.application.ports.uow import UnitOfWork
from app.domain.entities.dataset_artifact import DatasetArtifact
from app.domain.entities.image_item import ImageItem
from app.domain.entities.label import Label
from app.domain.entities.model_artifact import ModelArtifact
from app.domain.ports.repositories.dataset import IDatasetRepository
from app.domain.ports.repositories.image import ImageRepository
from app.domain.ports.repositories.label import ILabelRepository
from app.domain.ports.repositories.model import IModelRepository
from app.domain.value_objects.bbox import BBox
from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, Session, mapped_column, registry

mapper_registry = registry()
SessionFactory = Callable[[], Session]

class ModelRow(mapper_registry.generate_base()):
    __tablename__ = "models"
    id: Mapped[str] = mapped_column(primary_key=True)
    dataset_id: Mapped[str]
    base_weights: Mapped[str]
    best_weights_path: Mapped[str]
    epochs: Mapped[int]
    imgsz: Mapped[int]
    metrics_path: Mapped[str | None]
    created_at: Mapped[datetime]

class DatasetRow(mapper_registry.generate_base()):
    __tablename__ = "datasets"
    id: Mapped[str] = mapped_column(primary_key=True)
    class_names: Mapped[str]         # comma-joined for simplicity
    ratio: Mapped[float]
    num_pairs: Mapped[int]
    train_count: Mapped[int]
    val_count: Mapped[int]
    zip_relpath: Mapped[str]
    created_at: Mapped[datetime]

class ImageRow(mapper_registry.generate_base()):
    __tablename__ = "images"
    id: Mapped[str] = mapped_column(primary_key=True)
    url: Mapped[str]
    width: Mapped[int]
    height: Mapped[int]
    filename: Mapped[str]
    uploaded_at: Mapped[datetime]

class LabelRow(mapper_registry.generate_base()):
    __tablename__ = "labels"
    id: Mapped[str] = mapped_column(primary_key=True)
    image_id: Mapped[str] = mapped_column(ForeignKey("images.id"))
    class_name: Mapped[str]
    x: Mapped[float]
    y: Mapped[float]
    w: Mapped[float]
    h: Mapped[float]
    confidence: Mapped[float | None]
    source: Mapped[str]

class SqlAlchemyUnitOfWork(UnitOfWork):
    def __init__(self, session_factory: SessionFactory):
        self._session_factory = session_factory
        self._session: Session | None = None

        self.images = None
        self.labels = None
        self.datasets = None
        self.models = None

    @property
    def session(self) -> Session:
        assert self._session is not None, "Session is not active; did you forget to enter the UoW?"
        return self._session

    def __enter__(self):
        assert callable(self._session_factory), "session_factory must be callable"
        self._session = self._session_factory()
        assert isinstance(self._session, Session), f"Expected Session, got {type(self._session)}"

        # bind repositories to this session
        self.images = _ImageRepo(self.session)
        self.labels = _LabelRepo(self.session)
        self.datasets = _DatasetRepo(self.session)
        self.models = _ModelRepo(self.session)

        return self

    def __exit__(self, exc_type, exc, tb):
        try:
            if exc_type:
                self._session.rollback()
        finally:
            self._session.close()
            self._session = None

    def commit(self):
        self.session.commit()

    def rollback(self):
        self.session.rollback()

class _RepoBase:
    def __init__(self, session: Session):
        self.session = session

class _ModelRepo(IModelRepository, _RepoBase):
    def add(self, m: ModelArtifact) -> None:
        self.session.add(
            ModelRow(
                id=str(m.id),
                dataset_id=str(m.dataset_id),
                base_weights=m.base_weights,
                best_weights_path=m.best_weights_path,
                epochs=m.epochs,
                imgsz=m.imgsz,
                metrics_path=m.metrics_path,
                created_at=m.created_at
            )
        )

    def get(self, model_id: UUID) -> ModelArtifact | None:
        r = self.session.get(ModelRow, str(model_id))
        if not r: 
            return None
        
        return ModelArtifact(
            id=UUID(r.id),
            dataset_id=UUID(r.dataset_id),
            base_weights=r.base_weights,
            best_weights_path=r.best_weights_path,
            epochs=r.epochs,
            imgsz=r.imgsz,
            metrics_path=r.metrics_path,
            created_at=r.created_at
        )

    def list(self, limit: int = 50):
        q = self.session.query(ModelRow).order_by(ModelRow.created_at.desc()).limit(limit)
        for r in q:
            yield ModelArtifact(
                id=UUID(r.id),
                dataset_id=UUID(r.dataset_id),
                base_weights=r.base_weights,
                best_weights_path=r.best_weights_path,
                epochs=r.epochs,
                imgsz=r.imgsz,
                metrics_path=r.metrics_path,
                created_at=r.created_at
            )        

    def delete(self, model_id: UUID) -> ModelArtifact | None:
        r = self.session.get(ModelRow, str(model_id))
        if not r:
            return None

        artifact = ModelArtifact(
            id=UUID(r.id),
            dataset_id=UUID(r.dataset_id),
            base_weights=r.base_weights,
            best_weights_path=r.best_weights_path,
            epochs=r.epochs,
            imgsz=r.imgsz,
            metrics_path=r.metrics_path,
            created_at=r.created_at,
        )
        self.session.delete(r)
        return artifact

    def list_for_dataset(self, dataset_id: UUID):
        q = self.session.query(ModelRow).where(ModelRow.dataset_id == str(dataset_id))
        for r in q.order_by(ModelRow.created_at.desc()):
            yield ModelArtifact(
                id=UUID(r.id),
                dataset_id=UUID(r.dataset_id),
                base_weights=r.base_weights,
                best_weights_path=r.best_weights_path,
                epochs=r.epochs,
                imgsz=r.imgsz,
                metrics_path=r.metrics_path,
                created_at=r.created_at,
            )

class _DatasetRepo(IDatasetRepository, _RepoBase):
    def add(self, ds: DatasetArtifact) -> None:
        self.session.add(
            DatasetRow(
                id=str(ds.id),
                class_names=",".join(ds.class_names),
                ratio=ds.ratio,
                num_pairs=ds.num_pairs,
                train_count=ds.train_count,
                val_count=ds.val_count,
                zip_relpath=ds.zip_relpath,
                created_at=ds.created_at
            )
        )

    def get(self, dataset_id: UUID) -> DatasetArtifact | None:
        r = self.session.get(DatasetRow, str(dataset_id))
        if not r:
            return None
        
        return DatasetArtifact(
            id=UUID(r.id),
            class_names=[x for x in r.class_names.split(",") if x],
            ratio=r.ratio,
            num_pairs=r.num_pairs,
            train_count=r.train_count,
            val_count=r.val_count,
            zip_relpath=r.zip_relpath,
            created_at=r.created_at
        )

    def list(self, limit: int = 50):
        q = self.session.query(DatasetRow).order_by(DatasetRow.created_at.desc()).limit(limit)
        for r in q:
            yield DatasetArtifact(
                id=UUID(r.id),
                class_names=[x for x in r.class_names.split(",") if x],
                ratio=r.ratio,
                num_pairs=r.num_pairs,
                train_count=r.train_count,
                val_count=r.val_count,
                zip_relpath=r.zip_relpath,
                created_at=r.created_at
            )

    def delete(self, dataset_id: UUID) -> DatasetArtifact | None:
        r = self.session.get(DatasetRow, str(dataset_id))
        if not r:
            return None

        artifact = DatasetArtifact(
            id=UUID(r.id),
            class_names=[x for x in r.class_names.split(",") if x],
            ratio=r.ratio,
            num_pairs=r.num_pairs,
            train_count=r.train_count,
            val_count=r.val_count,
            zip_relpath=r.zip_relpath,
            created_at=r.created_at,
        )
        self.session.delete(r)
        return artifact

class _ImageRepo(ImageRepository, _RepoBase):
    def add(self, img: ImageItem) -> None:
        self.session.add(
            ImageRow(
                id=str(img.id), 
                url=img.url, 
                width=img.width, 
                height=img.height,
                filename=img.filename, 
                uploaded_at=img.uploaded_at
            )
        )

    def get(self, image_id: UUID) -> ImageItem | None:
        row = self.session.get(ImageRow, str(image_id))
        if not row:
            return None
        
        return ImageItem(
            id=UUID(row.id), 
            url=row.url, 
            width=row.width, 
            height=row.height, 
            filename=row.filename, 
            uploaded_at=row.uploaded_at
        )

    def list(self, query: str | None = None, limit: int = 20):
        q = self.session.query(ImageRow).order_by(ImageRow.uploaded_at.desc())
        if query:
            q = q.filter(ImageRow.filename.contains(query))
        
        for row in q.limit(limit):
            yield ImageItem(
                id=UUID(row.id), 
                url=row.url, 
                width=row.width, 
                height=row.height, 
                filename=row.filename, 
                uploaded_at=row.uploaded_at
            )

class _LabelRepo(ILabelRepository, _RepoBase):
    def add_many(self, labels: list[Label]) -> None:
        self.session.add_all(
            [
                LabelRow(
                    id=str(label.id),
                    image_id=str(label.image_id),
                    class_name=label.class_name,
                    x=label.bbox.x, y=label.bbox.y, w=label.bbox.w, h=label.bbox.h,
                    confidence=label.confidence,
                    source=label.source
                ) 
                for label in labels
            ]
        )

    def list_for_image(self, image_id: UUID) -> list[Label]:
        rows = self.session.query(LabelRow).filter(LabelRow.image_id == str(image_id)).all()
        return [
            Label(
                id=UUID(r.id),
                image_id=UUID(r.image_id),
                class_name=r.class_name,
                bbox=BBox(r.x, r.y, r.w, r.h),
                confidence=r.confidence,
                source=r.source
            )
            for r in rows
        ]
