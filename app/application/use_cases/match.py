from typing import List, Tuple
from uuid import UUID
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

from app.application.ports.uow import UnitOfWork
from app.application.ports.detector import Detector
from app.application.ports.embedder import  Embedder

from app.domain.entities.match_result import MatchResult
from app.domain.entities.label import Label
from app.domain.entities.identity import Identity

class MatchService:
    def __init__(self, uow: UnitOfWork, detector: Detector, embedder: Embedder):
        self.uow = uow
        self.detector = detector
        self.embedder = embedder

    def _best_identity(self, crop_embeddings: List[np.ndarray]) -> List[Tuple[UUID | None, str | None, float | None]]:
        """Return per-crop best (identity_id, name, similarity)."""
        with self.uow as u:
            all_items = u.identity_embeddings.list_all()
            if not all_items:
                return [(None, None, None)] * len(crop_embeddings)

            id_to_name: dict[UUID, str] = {i.id: i.name for i in u.identities.list(1000)}  # cache names
            # Stack reference embeddings
            ref_vecs = np.array([it.vector for it in all_items], dtype=float)
            ref_ids = [it.identity_id for it in all_items]

        out = []
        for emb in crop_embeddings:
            sims = cosine_similarity([emb], ref_vecs)[0]
            k = int(np.argmax(sims))
            best_ref_id = ref_ids[k]
            with self.uow as u:
                ident = u.identities.get(best_ref_id)
            out.append((best_ref_id, (ident.name if ident else None), float(sims[k])))
        return out

    def match_in_image(self, image_id: UUID, image_bytes: bytes) -> List[MatchResult]:
        # 1) run detector (boxes)
        labels: List[Label] = self.detector.detect(image_bytes)
        if not labels:
            return []

        # 2) crop each box and embed
        # NOTE: we reuse the detector's image read to avoid double decode; for clarity re-open here.
        from PIL import Image
        import io
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        W, H = img.size
        crops: List[np.ndarray] = []
        for l in labels:
            x1 = max(int(l.bbox.x * W), 0); y1 = max(int(l.bbox.y * H), 0)
            x2 = min(int((l.bbox.x + l.bbox.w) * W), W); y2 = min(int((l.bbox.y + l.bbox.h) * H), H)
            crop_img = img.crop((x1, y1, x2, y2))
            buf = io.BytesIO(); crop_img.save(buf, format="PNG")
            emb = np.array(self.embedder.embed_image(buf.getvalue()), dtype=float)
            crops.append(emb)

        # 3) identity best match per crop
        best = self._best_identity(crops)

        # 4) materialize match results
        results: List[MatchResult] = []
        for l, (iid, name, sim) in zip(labels, best):
            results.append(MatchResult(
                detection=l,
                matched_identity_id=iid,
                matched_identity_name=name,
                similarity=sim
            ))
        return results
