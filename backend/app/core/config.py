import os

from pydantic import BaseModel


def _env_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default

    return value.strip().lower() in {"1", "true", "yes", "on"}


class Settings(BaseModel):
    ENV: str = os.getenv("ENV", "dev")
    MEDIA_DIR: str = os.getenv("MEDIA_DIR", "data/media")
    BASE_URL: str = os.getenv("BASE_URL", "http://localhost:8000")
    DB_URL: str = os.getenv("DB_URL", "sqlite:///data/app.db")
    YOLO_WEIGHTS: str = os.getenv("YOLO_WEIGHTS", "ml_models/yolo.pt")
    AUTH_LOGIN: str = os.getenv("AUTH_LOGIN", "admin")
    AUTH_PASSWORD: str = os.getenv("AUTH_PASSWORD", "admin")
    AUTH_USER_ID: str = os.getenv("AUTH_USER_ID", "local-admin")
    AUTH_DISPLAY_NAME: str = os.getenv("AUTH_DISPLAY_NAME", "Local Admin")
    AUTH_ISSUER: str = os.getenv("AUTH_ISSUER", "omnia_detect")
    AUTH_SECRET_KEY: str = os.getenv("AUTH_SECRET_KEY", "change-me-in-production")
    AUTH_ACCESS_TOKEN_TTL_SECONDS: int = int(os.getenv("AUTH_ACCESS_TOKEN_TTL_SECONDS", "900"))
    AUTH_REFRESH_TOKEN_TTL_SECONDS: int = int(
        os.getenv("AUTH_REFRESH_TOKEN_TTL_SECONDS", str(7 * 24 * 60 * 60))
    )
    AUTH_REFRESH_COOKIE_NAME: str = os.getenv(
        "AUTH_REFRESH_COOKIE_NAME",
        "omnia_refresh_token",
    )
    AUTH_COOKIE_SECURE: bool = _env_bool("AUTH_COOKIE_SECURE", False)
    AUTH_COOKIE_SAMESITE: str = os.getenv("AUTH_COOKIE_SAMESITE", "lax")


settings = Settings()
