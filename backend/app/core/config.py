from pydantic import BaseModel
import os

class Settings(BaseModel):
    ENV: str = os.getenv("ENV", "dev")
    MEDIA_DIR: str = os.getenv("MEDIA_DIR", "data/media")
    BASE_URL: str = os.getenv("BASE_URL", "http://localhost:8000")
    DB_URL: str = os.getenv("DB_URL", "sqlite:///data/app.db")
    YOLO_WEIGHTS: str = os.getenv("YOLO_WEIGHTS", "ml_models/yolo.pt")
    EMBEDDER_MODEL: str = os.getenv("EMBEDDER_MODEL", "clip-ViT-B-32")

settings = Settings()