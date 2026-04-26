from app.application.use_cases.login import LoginUseCase
from app.application.use_cases.refresh_session import RefreshSessionUseCase
from app.application.use_cases.register import RegisterUseCase
from app.core.config import settings
from app.domain.entities.auth_session import AuthSession
from app.domain.exceptions.auth import AuthError
from app.presentation.schemas.auth_session import AuthSessionSchema
from app.presentation.schemas.login_request import LoginRequestSchema
from app.presentation.schemas.register_request import RegisterRequestSchema
from app.presentation.schemas.user import UserSchema
from fastapi import APIRouter, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse
from fastapi_injector import Injected

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        key=settings.AUTH_REFRESH_COOKIE_NAME,
        value=refresh_token,
        httponly=True,
        secure=settings.AUTH_COOKIE_SECURE,
        samesite=settings.AUTH_COOKIE_SAMESITE,
        path="/api/auth",
        max_age=settings.AUTH_REFRESH_TOKEN_TTL_SECONDS,
    )


def _delete_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.AUTH_REFRESH_COOKIE_NAME,
        path="/api/auth",
        secure=settings.AUTH_COOKIE_SECURE,
        samesite=settings.AUTH_COOKIE_SAMESITE,
    )


def _to_session_schema(session: AuthSession) -> AuthSessionSchema:
    return AuthSessionSchema(
        accessToken=session.access_token,
        user=UserSchema(
            id=session.user.id,
            login=session.user.login,
            name=session.user.name,
        ),
    )


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

    _set_refresh_cookie(response, session.refresh_token)

    return _to_session_schema(session)


@router.post(
    "/register",
    response_model=AuthSessionSchema,
    status_code=status.HTTP_201_CREATED,
)
def register(
    payload: RegisterRequestSchema,
    response: Response,
    use_case: RegisterUseCase = Injected(RegisterUseCase),
):
    try:
        session = use_case.execute(payload.login, payload.password, payload.name)
    except AuthError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    _set_refresh_cookie(response, session.refresh_token)

    return _to_session_schema(session)


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
        _delete_refresh_cookie(error_response)
        return error_response

    _set_refresh_cookie(response, session.refresh_token)

    return _to_session_schema(session)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response):
    _delete_refresh_cookie(response)

    response.status_code = status.HTTP_204_NO_CONTENT
    return response
