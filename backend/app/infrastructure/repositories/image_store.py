from app.application.ports.image_store import ImageStore
from pathlib import Path
from PIL import Image
import io, os

class LocalImageStore(ImageStore):
    def __init__(self, media_dir: str, base_url: str):
        self.root = Path(media_dir)
        self.root.mkdir(parents=True, exist_ok=True)
        self.base_url = base_url.rstrip("/")

    def save(self, filename: str, content: bytes) -> tuple[str,int,int]:
        safe = os.path.basename(filename)
        path = self.root / safe
        
        with open(path, "wb") as f:
            f.write(content)
        
        im = Image.open(io.BytesIO(content)).convert("RGB")
        w, h = im.size
        public_url = f"{self.base_url}/media/{safe}"
        return public_url, w, h

    def get(self, filename: str) -> tuple[bytes, int, int]:
        safe = os.path.basename(filename)
        path = self.root / safe
        if not path.exists():
            raise FileNotFoundError(f"Image '{filename}' not found at {path}")
        content = path.read_bytes()
        im = Image.open(io.BytesIO(content)).convert("RGB")
        w, h = im.size
        return content, w, h