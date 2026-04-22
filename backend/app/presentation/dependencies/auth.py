from fastapi import HTTPException, Request, status
from fastapi_injector import Injected

from app.application.use_cases.verify_access_token import VerifyAccessTokenUseCase
from app.domain.entities.user import User
from app.domain.exceptions.auth import AuthError


def require_authenticated_user(
    request: Request,
    use_case: VerifyAccessTokenUseCase = Injected(VerifyAccessTokenUseCase),
) -> User:
    authorization = request.headers.get("Authorization", "")
    scheme, _, token = authorization.partition(" ")

    if scheme.lower() != "bearer" or not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token",
        )

    try:
        return use_case.execute(token)
    except AuthError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc
