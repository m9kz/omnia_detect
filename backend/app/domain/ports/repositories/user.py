from typing import Protocol

from app.domain.entities.user import User


class IUserRepository(Protocol):
    def add(self, user: User) -> None:
        ...

    def get(self, user_id: str) -> User | None:
        ...

    def get_by_login(self, login: str) -> User | None:
        ...
