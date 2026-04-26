from uuid import uuid4

from app.application.ports.uow import UnitOfWork
from app.domain.entities.auth_session import AuthSession
from app.domain.entities.user import User
from app.domain.exceptions.auth import AuthError
from app.domain.services.auth_service import AuthService


class RegisterUseCase:
    def __init__(self, auth_service: AuthService, uow: UnitOfWork) -> None:
        self.auth_service = auth_service
        self.uow = uow

    def execute(self, login: str, password: str, name: str | None = None) -> AuthSession:
        login = login.strip()
        display_name = name.strip() if name else None

        if len(login) < 3:
            raise AuthError("Login must be at least 3 characters")

        if any(character.isspace() for character in login):
            raise AuthError("Login cannot contain whitespace")

        if len(password) < 8:
            raise AuthError("Password must be at least 8 characters")

        if display_name == "":
            display_name = None

        with self.uow as uow:
            if uow.users.get_by_login(login):
                raise AuthError("Login is already registered")

            user = User(
                id=str(uuid4()),
                login=login,
                name=display_name,
                password_hash=self.auth_service.hash_password(password),
            )
            uow.users.add(user)
            uow.commit()

        return self.auth_service.issue_session(user)
