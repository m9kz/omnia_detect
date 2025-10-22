from sqlalchemy import create_engine, ForeignKey, JSON
from sqlalchemy.orm import registry, Session, Mapped, mapped_column
from uuid import UUID
from datetime import datetime

from app.domain.entities.image_item import ImageItem
from app.domain.entities.label import Label
from app.domain.entities.identity import Identity
from app.domain.entities.identity_embedding import IdentityEmbedding

from app.domain.value_objects.bbox import BBox
from app.domain.ports.repositories.image import ImageRepository
from app.domain.ports.repositories.label import LabelRepository
from app.domain.ports.repositories.identity import IdentityRepository
from app.domain.ports.repositories.identity_embedding import IdentityEmbeddingRepository

mapper_registry = registry()

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

class IdentityRow(mapper_registry.generate_base()):
    __tablename__ = "identities"
    id: Mapped[str] = mapped_column(primary_key=True)
    name: Mapped[str]
    created_at: Mapped[datetime]

class IdentityEmbeddingRow(mapper_registry.generate_base()):
    __tablename__ = "identity_embeddings"
    id: Mapped[str] = mapped_column(primary_key=True)
    identity_id: Mapped[str] = mapped_column(ForeignKey("identities.id"))
    vector: Mapped[list[float]] = mapped_column(JSON)  # store as JSON        

class SqlAlchemyUnitOfWork:
    def __init__(self, db_url: str):
        self.engine = create_engine(db_url, future=True)
        mapper_registry.metadata.create_all(self.engine)
        self._session: Session | None = None
        self.images = _ImageRepo(self)
        self.labels = _LabelRepo(self)
        self.identities = _IdentityRepo(self)
        self.identity_embeddings = _IdentityEmbeddingRepo(self)

    def __enter__(self):
        self._session = Session(self.engine)
        return self

    def __exit__(self, exc_type, exc, tb):
        if exc_type:
            self._session.rollback()
        self._session.close()
        self._session = None

    def commit(self):
        assert self._session
        self._session.commit()

class _ImageRepo(ImageRepository):
    def __init__(self, uow: SqlAlchemyUnitOfWork):
        self.uow = uow

    def add(self, img: ImageItem) -> None:
        s = self.uow._session
        s.add(ImageRow(
            id=str(img.id), url=img.url, width=img.width, height=img.height,
            filename=img.filename, uploaded_at=img.uploaded_at
        ))

    def get(self, image_id: UUID) -> ImageItem | None:
        s = self.uow._session
        row = s.get(ImageRow, str(image_id))
        if not row: return None
        return ImageItem(id=UUID(row.id), url=row.url, width=row.width, height=row.height, filename=row.filename, uploaded_at=row.uploaded_at)

    def list(self, query: str | None = None, limit: int = 20):
        s = self.uow._session
        q = s.query(ImageRow).order_by(ImageRow.uploaded_at.desc())
        
        if query:
            q = q.filter(ImageRow.filename.contains(query))
        
        for row in q.limit(limit):
            yield ImageItem(id=UUID(row.id), url=row.url, width=row.width, height=row.height, filename=row.filename, uploaded_at=row.uploaded_at)

class _LabelRepo(LabelRepository):
    def __init__(self, uow: SqlAlchemyUnitOfWork):
        self.uow = uow

    def add_many(self, labels: list[Label]) -> None:
        s = self.uow._session
        for l in labels:
            s.add(LabelRow(
                id=str(l.id), image_id=str(l.image_id), class_name=l.class_name,
                x=l.bbox.x, y=l.bbox.y, w=l.bbox.w, h=l.bbox.h,
                confidence=l.confidence, source=l.source
            ))

    def list_for_image(self, image_id: UUID) -> list[Label]:
        s = self.uow._session
        rows = s.query(LabelRow).filter(LabelRow.image_id == str(image_id)).all()
        out: list[Label] = []
        for r in rows:
            out.append(Label(
                id=UUID(r.id), image_id=UUID(r.image_id), class_name=r.class_name,
                bbox=BBox(r.x, r.y, r.w, r.h), confidence=r.confidence, source=r.source
            ))
        return out
    
class _IdentityRepo(IdentityRepository):
    def __init__(self, uow: SqlAlchemyUnitOfWork):
        self.uow = uow

    def add(self, identity: Identity) -> None:
        s = self.uow._session
        s.add(IdentityRow(id=str(identity.id), name=identity.name, created_at=identity.created_at))

    def get(self, identity_id: UUID) -> Identity | None:
        s = self.uow._session
        row = s.get(IdentityRow, str(identity_id))
        if not row: return None
        return Identity(id=UUID(row.id), name=row.name, created_at=row.created_at)

    def get_by_name(self, name: str) -> Identity | None:
        s = self.uow._session
        row = s.query(IdentityRow).filter(IdentityRow.name == name).first()
        if not row: return None
        return Identity(id=UUID(row.id), name=row.name, created_at=row.created_at)

    def list(self, limit: int = 50):
        s = self.uow._session
        q = s.query(IdentityRow).order_by(IdentityRow.created_at.desc()).limit(limit)
        for r in q:
            yield Identity(id=UUID(r.id), name=r.name, created_at=r.created_at)

class _IdentityEmbeddingRepo(IdentityEmbeddingRepository):
    def __init__(self, uow: SqlAlchemyUnitOfWork):
        self.uow = uow

    def add_many(self, items: list[IdentityEmbedding]) -> None:
        s = self.uow._session
        for it in items:
            s.add(IdentityEmbeddingRow(
                id=str(it.id), identity_id=str(it.identity_id), vector=it.vector
            ))

    def list_for_identity(self, identity_id: UUID) -> list[IdentityEmbedding]:
        s = self.uow._session
        rows = s.query(IdentityEmbeddingRow).where(IdentityEmbeddingRow.identity_id == str(identity_id)).all()
        return [IdentityEmbedding(id=UUID(r.id), identity_id=UUID(r.identity_id), vector=r.vector) for r in rows]

    def list_all(self) -> list[IdentityEmbedding]:
        s = self.uow._session
        rows = s.query(IdentityEmbeddingRow).all()
        return [IdentityEmbedding(id=UUID(r.id), identity_id=UUID(r.identity_id), vector=r.vector) for r in rows]
