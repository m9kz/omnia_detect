from app.domain.entities.auth_session import AuthSession
from app.application.ports.uow import UnitOfWork
from app.domain.services.auth_service import AuthService


class LoginUseCase:
    def __init__(self, auth_service: AuthService, uow: UnitOfWork) -> None:
        self.auth_service = auth_service
        self.uow = uow

    def execute(self, login: str, password: str) -> AuthSession:
        with self.uow as uow:
            user = uow.users.get_by_login(login.strip())

        user = self.auth_service.authenticate(user=user, password=password)
        return self.auth_service.issue_session(user)
