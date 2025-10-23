from typing import Protocol
import numpy as np

class Embedder(Protocol):
    def embed_image(self, image_bytes: bytes) -> list[float]:
        """Return L2-normalized embedding vector."""
        ...
