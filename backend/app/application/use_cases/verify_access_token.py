from app.domain.entities.user import User
from app.application.ports.uow import UnitOfWork
from app.domain.services.auth_service import AuthService


class VerifyAccessTokenUseCase:
    def __init__(self, auth_service: AuthService, uow: UnitOfWork) -> None:
        self.auth_service = auth_service
        self.uow = uow

    def execute(self, access_token: str) -> User:
        user_id = self.auth_service.read_token_subject(
            access_token,
            expected_type="access",
        )

        with self.uow as uow:
            user = uow.users.get(user_id)

        return self.auth_service.verify_access_token(access_token, user)
