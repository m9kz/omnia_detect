from typing import Iterable
from uuid import uuid4

from app.application.ports.embedder import Embedder
from app.application.ports.uow import UnitOfWork
from app.domain.entities.identity import Identity
from app.domain.entities.identity_embedding import IdentityEmbedding


class IdentityService:
    def __init__(self, uow: UnitOfWork, embedder: Embedder):
        self.uow = uow
        self.embedder = embedder

    def create_or_get_identity(self, name: str) -> Identity:
        with self.uow as u:
            existing = u.identities.get_by_name(name)
            if existing:
                return existing
            
            ident = Identity(id=uuid4(), name=name)
            u.identities.add(ident)
            u.commit()
            return ident

    def add_reference_images(self, identity_name: str, images: Iterable[bytes]) -> int:
        """
        Embeds and stores multiple reference images for an identity (create if absent).
        """
        with self.uow as u:
            identity = u.identities.get_by_name(identity_name)
            if not identity:
                identity = Identity(id=uuid4(), name=identity_name)
                u.identities.add(identity)

            items: list[IdentityEmbedding] = []
            for img in images:
                vec = self.embedder.embed_image(img)
                items.append(IdentityEmbedding(id=uuid4(), identity_id=identity.id, vector=vec))

            u.identity_embeddings.add_many(items)
            u.commit()
            return len(items)
