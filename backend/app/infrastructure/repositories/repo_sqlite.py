from datetime import datetime
from typing import Callable
from uuid import UUID

from app.application.ports.uow import UnitOfWork
from app.domain.entities.dataset_artifact import DatasetArtifact
from app.domain.entities.image_item import ImageItem
from app.domain.entities.label import Label
from app.domain.entities.model_artifact import ModelArtifact
from app.domain.entities.train_job import PENDING_TRAIN_JOB_STATUSES, TrainJob
from app.domain.ports.repositories.dataset import IDatasetRepository
from app.domain.ports.repositories.image import ImageRepository
from app.domain.ports.repositories.label import ILabelRepository
from app.domain.ports.repositories.model import IModelRepository
from app.domain.ports.repositories.train_job import ITrainJobRepository
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
    class_names: Mapped[str]
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


class TrainJobRow(mapper_registry.generate_base()):
    __tablename__ = "train_jobs"
    id: Mapped[str] = mapped_column(primary_key=True)
    dataset_id: Mapped[str]
    status: Mapped[str]
    progress: Mapped[int]
    current_epoch: Mapped[int | None]
    total_epochs: Mapped[int]
    epochs: Mapped[int]
    imgsz: Mapped[int]
    base_weights: Mapped[str]
    base_model_id: Mapped[str | None]
    model_id: Mapped[str | None]
    message: Mapped[str | None]
    error: Mapped[str | None]
    created_at: Mapped[datetime]
    started_at: Mapped[datetime | None]
    finished_at: Mapped[datetime | None]


class SqlAlchemyUnitOfWork(UnitOfWork):
    def __init__(self, session_factory: SessionFactory):
        self._session_factory = session_factory
        self._session: Session | None = None

        self.images = None
        self.labels = None
        self.datasets = None
        self.models = None
        self.jobs = None

    @property
    def session(self) -> Session:
        assert self._session is not None, "Session is not active; did you forget to enter the UoW?"
        return self._session

    def __enter__(self):
        assert callable(self._session_factory), "session_factory must be callable"
        self._session = self._session_factory()
        assert isinstance(self._session, Session), f"Expected Session, got {type(self._session)}"

        self.images = _ImageRepo(self.session)
        self.labels = _LabelRepo(self.session)
        self.datasets = _DatasetRepo(self.session)
        self.models = _ModelRepo(self.session)
        self.jobs = _TrainJobRepo(self.session)

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


def _to_train_job(row: TrainJobRow) -> TrainJob:
    return TrainJob(
        id=UUID(row.id),
        dataset_id=UUID(row.dataset_id),
        status=row.status,
        progress=row.progress,
        current_epoch=row.current_epoch,
        total_epochs=row.total_epochs,
        epochs=row.epochs,
        imgsz=row.imgsz,
        base_weights=row.base_weights,
        base_model_id=UUID(row.base_model_id) if row.base_model_id else None,
        model_id=UUID(row.model_id) if row.model_id else None,
        message=row.message,
        error=row.error,
        created_at=row.created_at,
        started_at=row.started_at,
        finished_at=row.finished_at,
    )


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
                created_at=m.created_at,
            )
        )

    def get(self, model_id: UUID) -> ModelArtifact | None:
        row = self.session.get(ModelRow, str(model_id))
        if not row:
            return None

        return ModelArtifact(
            id=UUID(row.id),
            dataset_id=UUID(row.dataset_id),
            base_weights=row.base_weights,
            best_weights_path=row.best_weights_path,
            epochs=row.epochs,
            imgsz=row.imgsz,
            metrics_path=row.metrics_path,
            created_at=row.created_at,
        )

    def list(self, limit: int = 50):
        q = self.session.query(ModelRow).order_by(ModelRow.created_at.desc()).limit(limit)
        for row in q:
            yield ModelArtifact(
                id=UUID(row.id),
                dataset_id=UUID(row.dataset_id),
                base_weights=row.base_weights,
                best_weights_path=row.best_weights_path,
                epochs=row.epochs,
                imgsz=row.imgsz,
                metrics_path=row.metrics_path,
                created_at=row.created_at,
            )

    def delete(self, model_id: UUID) -> ModelArtifact | None:
        row = self.session.get(ModelRow, str(model_id))
        if not row:
            return None

        artifact = ModelArtifact(
            id=UUID(row.id),
            dataset_id=UUID(row.dataset_id),
            base_weights=row.base_weights,
            best_weights_path=row.best_weights_path,
            epochs=row.epochs,
            imgsz=row.imgsz,
            metrics_path=row.metrics_path,
            created_at=row.created_at,
        )
        self.session.delete(row)
        return artifact

    def list_for_dataset(self, dataset_id: UUID):
        q = self.session.query(ModelRow).where(ModelRow.dataset_id == str(dataset_id))
        for row in q.order_by(ModelRow.created_at.desc()):
            yield ModelArtifact(
                id=UUID(row.id),
                dataset_id=UUID(row.dataset_id),
                base_weights=row.base_weights,
                best_weights_path=row.best_weights_path,
                epochs=row.epochs,
                imgsz=row.imgsz,
                metrics_path=row.metrics_path,
                created_at=row.created_at,
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
                created_at=ds.created_at,
            )
        )

    def get(self, dataset_id: UUID) -> DatasetArtifact | None:
        row = self.session.get(DatasetRow, str(dataset_id))
        if not row:
            return None

        return DatasetArtifact(
            id=UUID(row.id),
            class_names=[item for item in row.class_names.split(",") if item],
            ratio=row.ratio,
            num_pairs=row.num_pairs,
            train_count=row.train_count,
            val_count=row.val_count,
            zip_relpath=row.zip_relpath,
            created_at=row.created_at,
        )

    def list(self, limit: int = 50):
        q = self.session.query(DatasetRow).order_by(DatasetRow.created_at.desc()).limit(limit)
        for row in q:
            yield DatasetArtifact(
                id=UUID(row.id),
                class_names=[item for item in row.class_names.split(",") if item],
                ratio=row.ratio,
                num_pairs=row.num_pairs,
                train_count=row.train_count,
                val_count=row.val_count,
                zip_relpath=row.zip_relpath,
                created_at=row.created_at,
            )

    def delete(self, dataset_id: UUID) -> DatasetArtifact | None:
        row = self.session.get(DatasetRow, str(dataset_id))
        if not row:
            return None

        artifact = DatasetArtifact(
            id=UUID(row.id),
            class_names=[item for item in row.class_names.split(",") if item],
            ratio=row.ratio,
            num_pairs=row.num_pairs,
            train_count=row.train_count,
            val_count=row.val_count,
            zip_relpath=row.zip_relpath,
            created_at=row.created_at,
        )
        self.session.delete(row)
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
                uploaded_at=img.uploaded_at,
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
            uploaded_at=row.uploaded_at,
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
                uploaded_at=row.uploaded_at,
            )


class _LabelRepo(ILabelRepository, _RepoBase):
    def add_many(self, labels: list[Label]) -> None:
        self.session.add_all(
            [
                LabelRow(
                    id=str(label.id),
                    image_id=str(label.image_id),
                    class_name=label.class_name,
                    x=label.bbox.x,
                    y=label.bbox.y,
                    w=label.bbox.w,
                    h=label.bbox.h,
                    confidence=label.confidence,
                    source=label.source,
                )
                for label in labels
            ]
        )

    def list_for_image(self, image_id: UUID) -> list[Label]:
        rows = self.session.query(LabelRow).filter(LabelRow.image_id == str(image_id)).all()
        return [
            Label(
                id=UUID(row.id),
                image_id=UUID(row.image_id),
                class_name=row.class_name,
                bbox=BBox(row.x, row.y, row.w, row.h),
                confidence=row.confidence,
                source=row.source,
            )
            for row in rows
        ]


class _TrainJobRepo(ITrainJobRepository, _RepoBase):
    def add(self, job: TrainJob) -> None:
        self.session.add(
            TrainJobRow(
                id=str(job.id),
                dataset_id=str(job.dataset_id),
                status=job.status,
                progress=job.progress,
                current_epoch=job.current_epoch,
                total_epochs=job.total_epochs,
                epochs=job.epochs,
                imgsz=job.imgsz,
                base_weights=job.base_weights,
                base_model_id=str(job.base_model_id) if job.base_model_id else None,
                model_id=str(job.model_id) if job.model_id else None,
                message=job.message,
                error=job.error,
                created_at=job.created_at,
                started_at=job.started_at,
                finished_at=job.finished_at,
            )
        )

    def get(self, job_id: UUID) -> TrainJob | None:
        row = self.session.get(TrainJobRow, str(job_id))
        if not row:
            return None
        return _to_train_job(row)

    def update(self, job: TrainJob) -> None:
        row = self.session.get(TrainJobRow, str(job.id))
        if not row:
            raise KeyError(f"Train job not found: {job.id}")

        row.dataset_id = str(job.dataset_id)
        row.status = job.status
        row.progress = job.progress
        row.current_epoch = job.current_epoch
        row.total_epochs = job.total_epochs
        row.epochs = job.epochs
        row.imgsz = job.imgsz
        row.base_weights = job.base_weights
        row.base_model_id = str(job.base_model_id) if job.base_model_id else None
        row.model_id = str(job.model_id) if job.model_id else None
        row.message = job.message
        row.error = job.error
        row.created_at = job.created_at
        row.started_at = job.started_at
        row.finished_at = job.finished_at

    def list(self, limit: int = 50):
        q = self.session.query(TrainJobRow).order_by(TrainJobRow.created_at.desc()).limit(limit)
        for row in q:
            yield _to_train_job(row)

    def list_pending(self, limit: int = 100):
        q = (
            self.session.query(TrainJobRow)
            .filter(TrainJobRow.status.in_(PENDING_TRAIN_JOB_STATUSES))
            .order_by(TrainJobRow.created_at.asc())
            .limit(limit)
        )
        for row in q:
            yield _to_train_job(row)

    def list_pending_for_dataset(self, dataset_id: UUID):
        q = (
            self.session.query(TrainJobRow)
            .filter(TrainJobRow.dataset_id == str(dataset_id))
            .filter(TrainJobRow.status.in_(PENDING_TRAIN_JOB_STATUSES))
            .order_by(TrainJobRow.created_at.desc())
        )
        for row in q:
            yield _to_train_job(row)

    def list_pending_for_base_model(self, model_id: UUID):
        q = (
            self.session.query(TrainJobRow)
            .filter(TrainJobRow.base_model_id == str(model_id))
            .filter(TrainJobRow.status.in_(PENDING_TRAIN_JOB_STATUSES))
            .order_by(TrainJobRow.created_at.desc())
        )
        for row in q:
            yield _to_train_job(row)
