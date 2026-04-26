from app.domain.entities.auth_session import AuthSession
from app.application.ports.uow import UnitOfWork
from app.domain.services.auth_service import AuthService


class RefreshSessionUseCase:
    def __init__(self, auth_service: AuthService, uow: UnitOfWork) -> None:
        self.auth_service = auth_service
        self.uow = uow

    def execute(self, refresh_token: str) -> AuthSession:
        user_id = self.auth_service.read_token_subject(
            refresh_token,
            expected_type="refresh",
        )

        with self.uow as uow:
            user = uow.users.get(user_id)

        return self.auth_service.refresh_session(refresh_token, user)
