from app.domain.entities.user import User
from app.domain.services.auth_service import AuthService


class VerifyAccessTokenUseCase:
    def __init__(self, auth_service: AuthService, configured_user: User) -> None:
        self.auth_service = auth_service
        self.configured_user = configured_user

    def execute(self, access_token: str) -> User:
        return self.auth_service.verify_access_token(access_token, self.configured_user)
