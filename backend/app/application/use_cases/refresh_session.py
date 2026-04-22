from app.domain.entities.auth_session import AuthSession
from app.domain.entities.user import User
from app.domain.services.auth_service import AuthService


class RefreshSessionUseCase:
    def __init__(self, auth_service: AuthService, configured_user: User) -> None:
        self.auth_service = auth_service
        self.configured_user = configured_user

    def execute(self, refresh_token: str) -> AuthSession:
        return self.auth_service.refresh_session(refresh_token, self.configured_user)
