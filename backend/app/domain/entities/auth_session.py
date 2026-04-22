from dataclasses import dataclass

from app.domain.entities.user import User


@dataclass(frozen=True)
class AuthSession:
    access_token: str
    refresh_token: str
    user: User
