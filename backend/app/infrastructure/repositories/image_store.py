import io
import os
from pathlib import Path

from app.application.ports.image_store import ImageStore
from PIL import Image


class LocalImageStore(ImageStore):
    def __init__(self, media_dir: str):
        self.root = Path(media_dir)
        self.root.mkdir(parents=True, exist_ok=True)

    def save(self, filename: str, content: bytes) -> tuple[int, int]:
        safe = os.path.basename(filename)
        path = self.root / safe
        
        with open(path, "wb") as f:
            f.write(content)
        
        im = Image.open(io.BytesIO(content)).convert("RGB")
        w, h = im.size
        return w, h

    def get(self, filename: str) -> tuple[bytes, int, int]:
        safe = os.path.basename(filename)
        path = self.root / safe
        
        if not path.exists():
            raise FileNotFoundError(f"Image '{filename}' not found at {path}")
        
        content = path.read_bytes()
        im = Image.open(io.BytesIO(content)).convert("RGB")
        w, h = im.size
        return content, w, h
