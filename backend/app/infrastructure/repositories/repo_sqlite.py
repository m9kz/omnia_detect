from datetime import datetime
from typing import Callable
from uuid import UUID

from app.application.ports.uow import UnitOfWork
from app.domain.entities.dataset_artifact import DatasetArtifact
from app.domain.entities.image_item import ImageItem
from app.domain.entities.label import Label
from app.domain.entities.model_artifact import ModelArtifact
from app.domain.entities.train_job import PENDING_TRAIN_JOB_STATUSES, TrainJob
from app.domain.entities.user import User
from app.domain.exceptions.base import NotFoundException
from app.domain.ports.repositories.dataset import IDatasetRepository
from app.domain.ports.repositories.image import ImageRepository
from app.domain.ports.repositories.label import ILabelRepository
from app.domain.ports.repositories.model import IModelRepository
from app.domain.ports.repositories.train_job import ITrainJobRepository
from app.domain.ports.repositories.user import IUserRepository
from app.domain.value_objects.bbox import BBox
from sqlalchemy import ForeignKey, func, inspect, text
from sqlalchemy.orm import Mapped, Session, mapped_column, registry

mapper_registry = registry()
SessionFactory = Callable[[], Session]


def _default_dataset_name(dataset_id: UUID | str) -> str:
    return f"Dataset {str(dataset_id)[:8]}"


def _default_model_name(model_id: UUID | str) -> str:
    return f"Model {str(model_id)[:8]}"


def ensure_metadata_columns(engine) -> None:
    inspector = inspect(engine)
    table_names = set(inspector.get_table_names())

    with engine.begin() as conn:
        if "datasets" in table_names:
            dataset_columns = {column["name"] for column in inspector.get_columns("datasets")}
            if "name" not in dataset_columns:
                conn.execute(text("ALTER TABLE datasets ADD COLUMN name VARCHAR"))
                conn.execute(
                    text(
                        "UPDATE datasets "
                        "SET name = 'Dataset ' || substr(id, 1, 8) "
                        "WHERE name IS NULL OR trim(name) = ''"
                    )
                )
            if "user_id" not in dataset_columns:
                conn.execute(text("ALTER TABLE datasets ADD COLUMN user_id VARCHAR"))
            if "size_bytes" not in dataset_columns:
                conn.execute(text("ALTER TABLE datasets ADD COLUMN size_bytes INTEGER DEFAULT 0"))

        if "models" in table_names:
            model_columns = {column["name"] for column in inspector.get_columns("models")}
            if "name" not in model_columns:
                conn.execute(text("ALTER TABLE models ADD COLUMN name VARCHAR"))
                conn.execute(
                    text(
                        "UPDATE models "
                        "SET name = 'Model ' || substr(id, 1, 8) "
                        "WHERE name IS NULL OR trim(name) = ''"
                    )
                )
            if "user_id" not in model_columns:
                conn.execute(text("ALTER TABLE models ADD COLUMN user_id VARCHAR"))
            if "size_bytes" not in model_columns:
                conn.execute(text("ALTER TABLE models ADD COLUMN size_bytes INTEGER DEFAULT 0"))

        if "images" in table_names:
            image_columns = {column["name"] for column in inspector.get_columns("images")}
            if "user_id" not in image_columns:
                conn.execute(text("ALTER TABLE images ADD COLUMN user_id VARCHAR"))

        if "train_jobs" in table_names:
            train_job_columns = {
                column["name"] for column in inspector.get_columns("train_jobs")
            }
            if "model_name" not in train_job_columns:
                conn.execute(text("ALTER TABLE train_jobs ADD COLUMN model_name VARCHAR"))
            if "user_id" not in train_job_columns:
                conn.execute(text("ALTER TABLE train_jobs ADD COLUMN user_id VARCHAR"))


class UserRow(mapper_registry.generate_base()):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(primary_key=True)
    login: Mapped[str] = mapped_column(unique=True, index=True)
    name: Mapped[str | None]
    password_hash: Mapped[str]


class ModelRow(mapper_registry.generate_base()):
    __tablename__ = "models"
    id: Mapped[str] = mapped_column(primary_key=True)
    user_id: Mapped[str | None] = mapped_column(index=True)
    name: Mapped[str]
    dataset_id: Mapped[str]
    base_weights: Mapped[str]
    best_weights_path: Mapped[str]
    epochs: Mapped[int]
    imgsz: Mapped[int]
    size_bytes: Mapped[int] = mapped_column(default=0)
    metrics_path: Mapped[str | None]
    created_at: Mapped[datetime]


class DatasetRow(mapper_registry.generate_base()):
    __tablename__ = "datasets"
    id: Mapped[str] = mapped_column(primary_key=True)
    user_id: Mapped[str | None] = mapped_column(index=True)
    name: Mapped[str]
    class_names: Mapped[str]
    ratio: Mapped[float]
    num_pairs: Mapped[int]
    train_count: Mapped[int]
    val_count: Mapped[int]
    zip_relpath: Mapped[str]
    size_bytes: Mapped[int] = mapped_column(default=0)
    created_at: Mapped[datetime]


class ImageRow(mapper_registry.generate_base()):
    __tablename__ = "images"
    id: Mapped[str] = mapped_column(primary_key=True)
    user_id: Mapped[str | None] = mapped_column(index=True)
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
    user_id: Mapped[str | None] = mapped_column(index=True)
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
    model_name: Mapped[str | None]
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
        self.users = None

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
        self.users = _UserRepo(self.session)

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
        user_id=row.user_id or "",
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
        model_name=row.model_name,
        message=row.message,
        error=row.error,
        created_at=row.created_at,
        started_at=row.started_at,
        finished_at=row.finished_at,
    )


def _to_user(row: UserRow) -> User:
    return User(
        id=row.id,
        login=row.login,
        name=row.name,
        password_hash=row.password_hash,
    )


def _to_model_artifact(row: ModelRow) -> ModelArtifact:
    return ModelArtifact(
        id=UUID(row.id),
        user_id=row.user_id or "",
        name=row.name or _default_model_name(row.id),
        dataset_id=UUID(row.dataset_id),
        base_weights=row.base_weights,
        best_weights_path=row.best_weights_path,
        epochs=row.epochs,
        imgsz=row.imgsz,
        size_bytes=row.size_bytes or 0,
        metrics_path=row.metrics_path,
        created_at=row.created_at,
    )


def _to_dataset_artifact(row: DatasetRow) -> DatasetArtifact:
    return DatasetArtifact(
        id=UUID(row.id),
        user_id=row.user_id or "",
        name=row.name or _default_dataset_name(row.id),
        class_names=[item for item in row.class_names.split(",") if item],
        ratio=row.ratio,
        num_pairs=row.num_pairs,
        train_count=row.train_count,
        val_count=row.val_count,
        zip_relpath=row.zip_relpath,
        size_bytes=row.size_bytes or 0,
        created_at=row.created_at,
    )


def _to_image_item(row: ImageRow) -> ImageItem:
    return ImageItem(
        id=UUID(row.id),
        user_id=row.user_id or "",
        url=row.url,
        width=row.width,
        height=row.height,
        filename=row.filename,
        uploaded_at=row.uploaded_at,
    )


class _UserRepo(IUserRepository, _RepoBase):
    def add(self, user: User) -> None:
        self.session.add(
            UserRow(
                id=user.id,
                login=user.login,
                name=user.name,
                password_hash=user.password_hash,
            )
        )

    def get(self, user_id: str) -> User | None:
        row = self.session.get(UserRow, user_id)
        if not row:
            return None

        return _to_user(row)

    def get_by_login(self, login: str) -> User | None:
        row = self.session.query(UserRow).filter(UserRow.login == login).one_or_none()
        if not row:
            return None

        return _to_user(row)


class _ModelRepo(IModelRepository, _RepoBase):
    def add(self, m: ModelArtifact) -> None:
        self.session.add(
            ModelRow(
                id=str(m.id),
                user_id=m.user_id,
                name=m.name,
                dataset_id=str(m.dataset_id),
                base_weights=m.base_weights,
                best_weights_path=m.best_weights_path,
                epochs=m.epochs,
                imgsz=m.imgsz,
                size_bytes=m.size_bytes,
                metrics_path=m.metrics_path,
                created_at=m.created_at,
            )
        )

    def get(self, model_id: UUID) -> ModelArtifact | None:
        row = self.session.get(ModelRow, str(model_id))
        if not row:
            return None

        return _to_model_artifact(row)

    def get_for_user(self, model_id: UUID, user_id: str) -> ModelArtifact | None:
        row = (
            self.session.query(ModelRow)
            .filter(ModelRow.id == str(model_id))
            .filter(ModelRow.user_id == user_id)
            .one_or_none()
        )
        if not row:
            return None

        return _to_model_artifact(row)

    def list(self, limit: int = 50):
        q = self.session.query(ModelRow).order_by(ModelRow.created_at.desc()).limit(limit)
        for row in q:
            yield _to_model_artifact(row)

    def list_for_user(self, user_id: str, limit: int = 50):
        q = (
            self.session.query(ModelRow)
            .filter(ModelRow.user_id == user_id)
            .order_by(ModelRow.created_at.desc())
            .limit(limit)
        )
        for row in q:
            yield _to_model_artifact(row)

    def delete(self, model_id: UUID) -> ModelArtifact | None:
        row = self.session.get(ModelRow, str(model_id))
        if not row:
            return None

        artifact = _to_model_artifact(row)
        self.session.delete(row)
        return artifact

    def delete_for_user(self, model_id: UUID, user_id: str) -> ModelArtifact | None:
        row = (
            self.session.query(ModelRow)
            .filter(ModelRow.id == str(model_id))
            .filter(ModelRow.user_id == user_id)
            .one_or_none()
        )
        if not row:
            return None

        artifact = _to_model_artifact(row)
        self.session.delete(row)
        return artifact

    def update(self, m: ModelArtifact) -> None:
        row = self.session.get(ModelRow, str(m.id))
        if not row:
            raise NotFoundException(f"Model not found: {m.id}")

        row.user_id = m.user_id
        row.name = m.name
        row.dataset_id = str(m.dataset_id)
        row.base_weights = m.base_weights
        row.best_weights_path = m.best_weights_path
        row.epochs = m.epochs
        row.imgsz = m.imgsz
        row.size_bytes = m.size_bytes
        row.metrics_path = m.metrics_path
        row.created_at = m.created_at

    def list_for_dataset(self, dataset_id: UUID):
        q = self.session.query(ModelRow).where(ModelRow.dataset_id == str(dataset_id))
        for row in q.order_by(ModelRow.created_at.desc()):
            yield _to_model_artifact(row)

    def list_for_dataset_for_user(self, dataset_id: UUID, user_id: str):
        q = (
            self.session.query(ModelRow)
            .filter(ModelRow.dataset_id == str(dataset_id))
            .filter(ModelRow.user_id == user_id)
            .order_by(ModelRow.created_at.desc())
        )
        for row in q:
            yield _to_model_artifact(row)

    def sum_size_for_user(self, user_id: str) -> int:
        value = (
            self.session.query(func.coalesce(func.sum(ModelRow.size_bytes), 0))
            .filter(ModelRow.user_id == user_id)
            .scalar()
        )
        return int(value or 0)


class _DatasetRepo(IDatasetRepository, _RepoBase):
    def add(self, ds: DatasetArtifact) -> None:
        self.session.add(
            DatasetRow(
                id=str(ds.id),
                user_id=ds.user_id,
                name=ds.name,
                class_names=",".join(ds.class_names),
                ratio=ds.ratio,
                num_pairs=ds.num_pairs,
                train_count=ds.train_count,
                val_count=ds.val_count,
                zip_relpath=ds.zip_relpath,
                size_bytes=ds.size_bytes,
                created_at=ds.created_at,
            )
        )

    def get(self, dataset_id: UUID) -> DatasetArtifact | None:
        row = self.session.get(DatasetRow, str(dataset_id))
        if not row:
            return None

        return _to_dataset_artifact(row)

    def get_for_user(self, dataset_id: UUID, user_id: str) -> DatasetArtifact | None:
        row = (
            self.session.query(DatasetRow)
            .filter(DatasetRow.id == str(dataset_id))
            .filter(DatasetRow.user_id == user_id)
            .one_or_none()
        )
        if not row:
            return None

        return _to_dataset_artifact(row)

    def list(self, limit: int = 50):
        q = self.session.query(DatasetRow).order_by(DatasetRow.created_at.desc()).limit(limit)
        for row in q:
            yield _to_dataset_artifact(row)

    def list_for_user(self, user_id: str, limit: int = 50):
        q = (
            self.session.query(DatasetRow)
            .filter(DatasetRow.user_id == user_id)
            .order_by(DatasetRow.created_at.desc())
            .limit(limit)
        )
        for row in q:
            yield _to_dataset_artifact(row)

    def delete(self, dataset_id: UUID) -> DatasetArtifact | None:
        row = self.session.get(DatasetRow, str(dataset_id))
        if not row:
            return None

        artifact = _to_dataset_artifact(row)
        self.session.delete(row)
        return artifact

    def delete_for_user(self, dataset_id: UUID, user_id: str) -> DatasetArtifact | None:
        row = (
            self.session.query(DatasetRow)
            .filter(DatasetRow.id == str(dataset_id))
            .filter(DatasetRow.user_id == user_id)
            .one_or_none()
        )
        if not row:
            return None

        artifact = _to_dataset_artifact(row)
        self.session.delete(row)
        return artifact

    def update(self, ds: DatasetArtifact) -> None:
        row = self.session.get(DatasetRow, str(ds.id))
        if not row:
            raise NotFoundException(f"Dataset not found: {ds.id}")

        row.user_id = ds.user_id
        row.name = ds.name
        row.class_names = ",".join(ds.class_names)
        row.ratio = ds.ratio
        row.num_pairs = ds.num_pairs
        row.train_count = ds.train_count
        row.val_count = ds.val_count
        row.zip_relpath = ds.zip_relpath
        row.size_bytes = ds.size_bytes
        row.created_at = ds.created_at

    def sum_size_for_user(self, user_id: str) -> int:
        value = (
            self.session.query(func.coalesce(func.sum(DatasetRow.size_bytes), 0))
            .filter(DatasetRow.user_id == user_id)
            .scalar()
        )
        return int(value or 0)


class _ImageRepo(ImageRepository, _RepoBase):
    def add(self, img: ImageItem) -> None:
        self.session.add(
            ImageRow(
                id=str(img.id),
                user_id=img.user_id,
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

        return _to_image_item(row)

    def get_for_user(self, image_id: UUID, user_id: str) -> ImageItem | None:
        row = (
            self.session.query(ImageRow)
            .filter(ImageRow.id == str(image_id))
            .filter(ImageRow.user_id == user_id)
            .one_or_none()
        )
        if not row:
            return None

        return _to_image_item(row)

    def list(self, query: str | None = None, limit: int = 20):
        q = self.session.query(ImageRow).order_by(ImageRow.uploaded_at.desc())
        if query:
            q = q.filter(ImageRow.filename.contains(query))

        for row in q.limit(limit):
            yield _to_image_item(row)

    def list_for_user(
        self,
        user_id: str,
        query: str | None = None,
        limit: int = 20,
    ):
        q = (
            self.session.query(ImageRow)
            .filter(ImageRow.user_id == user_id)
            .order_by(ImageRow.uploaded_at.desc())
        )
        if query:
            q = q.filter(ImageRow.filename.contains(query))

        for row in q.limit(limit):
            yield _to_image_item(row)


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
                user_id=job.user_id,
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
                model_name=job.model_name,
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

    def get_for_user(self, job_id: UUID, user_id: str) -> TrainJob | None:
        row = (
            self.session.query(TrainJobRow)
            .filter(TrainJobRow.id == str(job_id))
            .filter(TrainJobRow.user_id == user_id)
            .one_or_none()
        )
        if not row:
            return None
        return _to_train_job(row)

    def update(self, job: TrainJob) -> None:
        row = self.session.get(TrainJobRow, str(job.id))
        if not row:
            raise NotFoundException(f"Train job not found: {job.id}")

        row.user_id = job.user_id
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
        row.model_name = job.model_name
        row.message = job.message
        row.error = job.error
        row.created_at = job.created_at
        row.started_at = job.started_at
        row.finished_at = job.finished_at

    def list(self, limit: int = 50):
        q = self.session.query(TrainJobRow).order_by(TrainJobRow.created_at.desc()).limit(limit)
        for row in q:
            yield _to_train_job(row)

    def list_for_user(self, user_id: str, limit: int = 50):
        q = (
            self.session.query(TrainJobRow)
            .filter(TrainJobRow.user_id == user_id)
            .order_by(TrainJobRow.created_at.desc())
            .limit(limit)
        )
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

    def list_pending_for_dataset_for_user(self, dataset_id: UUID, user_id: str):
        q = (
            self.session.query(TrainJobRow)
            .filter(TrainJobRow.dataset_id == str(dataset_id))
            .filter(TrainJobRow.user_id == user_id)
            .filter(TrainJobRow.status.in_(PENDING_TRAIN_JOB_STATUSES))
            .order_by(TrainJobRow.created_at.desc())
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

    def list_pending_for_base_model_for_user(self, model_id: UUID, user_id: str):
        q = (
            self.session.query(TrainJobRow)
            .filter(TrainJobRow.base_model_id == str(model_id))
            .filter(TrainJobRow.user_id == user_id)
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
