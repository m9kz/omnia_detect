from app.domain.entities.auth_session import AuthSession
from app.domain.entities.user import User
from app.domain.services.auth_service import AuthService


class LoginUseCase:
    def __init__(
        self,
        auth_service: AuthService,
        configured_user: User,
        configured_password: str,
    ) -> None:
        self.auth_service = auth_service
        self.configured_user = configured_user
        self.configured_password = configured_password

    def execute(self, login: str, password: str) -> AuthSession:
        user = self.auth_service.authenticate(
            login=login,
            password=password,
            expected_user=self.configured_user,
            expected_password=self.configured_password,
        )
        return self.auth_service.issue_session(user)
