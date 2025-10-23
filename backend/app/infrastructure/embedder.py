import io, numpy as np
from PIL import Image
from sentence_transformers import SentenceTransformer

from app.application.ports.embedder import Embedder


class ClipImageEmbedder(Embedder):
    def __init__(self, model_name: str = "clip-ViT-B-32"):
        self.model = SentenceTransformer(model_name)

    def embed_image(self, image_bytes: bytes) -> list[float]:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        emb = self.model.encode(
            [img], 
            convert_to_numpy=True,
            normalize_embeddings=True
        )[0]
        return emb.astype(float).tolist()
