import pytest

from app.application.use_cases.login import LoginUseCase
from app.application.use_cases.refresh_session import RefreshSessionUseCase
from app.application.use_cases.register import RegisterUseCase
from app.application.use_cases.verify_access_token import VerifyAccessTokenUseCase
from app.domain.exceptions.auth import AuthError
from app.domain.exceptions.base import ConflictException
from app.domain.services.auth_service import AuthService
from app.shared.security.jwt import JwtCodec
from conftest import FakeUow, make_user


def make_auth_service(*, access_ttl=60, refresh_ttl=120) -> AuthService:
    return AuthService(
        jwt_codec=JwtCodec(b"test-secret"),
        issuer="omnia-test",
        access_token_ttl_seconds=access_ttl,
        refresh_token_ttl_seconds=refresh_ttl,
    )


def test_auth_service_hashes_password_and_verifies_tokens():
    service = make_auth_service()
    password_hash = service.hash_password("correct-password")
    user = make_user(password_hash=password_hash)

    assert service.verify_password("correct-password", password_hash)
    assert not service.verify_password("wrong-password", password_hash)
    assert service.authenticate(user=user, password="correct-password") == user

    session = service.issue_session(user)

    assert service.read_token_subject(session.access_token, expected_type="access") == user.id
    assert service.verify_access_token(session.access_token, user) == user
    assert service.verify_refresh_token(session.refresh_token, user) == user

    with pytest.raises(AuthError, match="Invalid token type"):
        service.verify_refresh_token(session.access_token, user)


def test_auth_service_rejects_invalid_credentials_and_expired_tokens():
    service = make_auth_service(access_ttl=-1)
    user = make_user(password_hash=service.hash_password("password"))
    session = service.issue_session(user)

    with pytest.raises(AuthError, match="Invalid login"):
        service.authenticate(user=None, password="password")

    with pytest.raises(AuthError, match="Token has expired"):
        service.verify_access_token(session.access_token, user)

    with pytest.raises(AuthError, match="Malformed token"):
        service.read_token_subject("bad-token", expected_type="access")


def test_auth_use_cases_login_refresh_and_verify_access_token():
    service = make_auth_service()
    user = make_user(id="user-1", login="demo", password_hash=service.hash_password("password"))
    uow = FakeUow(users={user.id: user})

    login_session = LoginUseCase(auth_service=service, uow=uow).execute(" demo ", "password")
    refreshed = RefreshSessionUseCase(auth_service=service, uow=uow).execute(
        login_session.refresh_token
    )
    verified_user = VerifyAccessTokenUseCase(auth_service=service, uow=uow).execute(
        refreshed.access_token
    )

    assert login_session.user == user
    assert refreshed.user == user
    assert verified_user == user


def test_register_use_case_validates_and_detects_conflicts():
    service = make_auth_service()
    uow = FakeUow()

    session = RegisterUseCase(auth_service=service, uow=uow).execute(
        " demo ",
        "password123",
        " Demo User ",
    )

    assert session.user.login == "demo"
    assert session.user.name == "Demo User"
    assert uow.users.added == session.user
    assert uow.commits == 1

    with pytest.raises(AuthError, match="at least 3"):
        RegisterUseCase(auth_service=service, uow=FakeUow()).execute("ab", "password123")

    with pytest.raises(ConflictException, match="already registered"):
        RegisterUseCase(auth_service=service, uow=uow).execute("demo", "password123")
