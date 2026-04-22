from app.application.use_cases.login import LoginUseCase
from app.application.use_cases.refresh_session import RefreshSessionUseCase
from app.core.config import settings
from app.domain.exceptions.auth import AuthError
from app.presentation.schemas.auth_session import AuthSessionSchema
from app.presentation.schemas.login_request import LoginRequestSchema
from app.presentation.schemas.user import UserSchema
from fastapi import APIRouter, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse
from fastapi_injector import Injected

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=AuthSessionSchema)
def login(
    payload: LoginRequestSchema,
    response: Response,
    use_case: LoginUseCase = Injected(LoginUseCase),
):
    try:
        session = use_case.execute(payload.login, payload.password)
    except AuthError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc

    response.set_cookie(
        key=settings.AUTH_REFRESH_COOKIE_NAME,
        value=session.refresh_token,
        httponly=True,
        secure=settings.AUTH_COOKIE_SECURE,
        samesite=settings.AUTH_COOKIE_SAMESITE,
        path="/api/auth",
        max_age=settings.AUTH_REFRESH_TOKEN_TTL_SECONDS,
    )
    
    return AuthSessionSchema(
        accessToken=session.access_token,
        user=UserSchema(
            id=session.user.id,
            login=session.user.login,
            name=session.user.name,
        ),
    )


@router.post("/token", response_model=AuthSessionSchema)
def refresh_token(
    request: Request,
    response: Response,
    use_case: RefreshSessionUseCase = Injected(RefreshSessionUseCase),
):
    refresh_token_value = request.cookies.get(settings.AUTH_REFRESH_COOKIE_NAME)
    if not refresh_token_value:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token is missing",
        )

    try:
        session = use_case.execute(refresh_token_value)
    except AuthError as exc:
        error_response = JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"detail": str(exc)},
        )
        error_response.delete_cookie(
            key=settings.AUTH_REFRESH_COOKIE_NAME,
            path="/api/auth",
            secure=settings.AUTH_COOKIE_SECURE,
            samesite=settings.AUTH_COOKIE_SAMESITE,
        )
        return error_response

    response.set_cookie(
        key=settings.AUTH_REFRESH_COOKIE_NAME,
        value=session.refresh_token,
        httponly=True,
        secure=settings.AUTH_COOKIE_SECURE,
        samesite=settings.AUTH_COOKIE_SAMESITE,
        path="/api/auth",
        max_age=settings.AUTH_REFRESH_TOKEN_TTL_SECONDS,
    )

    return AuthSessionSchema(
        accessToken=session.access_token,
        user=UserSchema(
            id=session.user.id,
            login=session.user.login,
            name=session.user.name,
        ),
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response):
    response.delete_cookie(
        key=settings.AUTH_REFRESH_COOKIE_NAME,
        path="/api/auth",
        secure=settings.AUTH_COOKIE_SECURE,
        samesite=settings.AUTH_COOKIE_SAMESITE,
    )
    
    response.status_code = status.HTTP_204_NO_CONTENT
    return response
