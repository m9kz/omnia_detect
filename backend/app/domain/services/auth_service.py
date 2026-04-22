from __future__ import annotations

import hmac
from datetime import datetime, timedelta, timezone
from typing import Any, Literal
from uuid import uuid4

from app.domain.entities.auth_session import AuthSession
from app.domain.entities.user import User
from app.domain.exceptions.auth import AuthError
from app.shared.security.jwt import JwtCodec, JwtCodecError

TokenType = Literal["access", "refresh"]


class AuthService:
    def __init__(
        self,
        *,
        jwt_codec: JwtCodec,
        issuer: str,
        access_token_ttl_seconds: int,
        refresh_token_ttl_seconds: int,
    ) -> None:
        self._jwt_codec = jwt_codec
        self._issuer = issuer
        self._access_token_ttl_seconds = access_token_ttl_seconds
        self._refresh_token_ttl_seconds = refresh_token_ttl_seconds

    def authenticate(
        self,
        *,
        login: str,
        password: str,
        expected_user: User,
        expected_password: str,
    ) -> User:
        if not hmac.compare_digest(login, expected_user.login):
            raise AuthError("Invalid login or password")

        if not hmac.compare_digest(password, expected_password):
            raise AuthError("Invalid login or password")

        return expected_user

    def issue_session(self, user: User) -> AuthSession:
        return AuthSession(
            access_token=self._encode_token(
                user=user,
                token_type="access",
                ttl_seconds=self._access_token_ttl_seconds,
            ),
            refresh_token=self._encode_token(
                user=user,
                token_type="refresh",
                ttl_seconds=self._refresh_token_ttl_seconds,
            ),
            user=user,
        )

    def refresh_session(self, refresh_token: str, expected_user: User) -> AuthSession:
        self.verify_refresh_token(refresh_token, expected_user)
        return self.issue_session(expected_user)

    def verify_access_token(self, access_token: str, expected_user: User) -> User:
        return self._verify_token(
            access_token,
            expected_type="access",
            expected_user=expected_user,
        )

    def verify_refresh_token(self, refresh_token: str, expected_user: User) -> User:
        return self._verify_token(
            refresh_token,
            expected_type="refresh",
            expected_user=expected_user,
        )

    def _verify_token(
        self,
        token: str,
        *,
        expected_type: TokenType,
        expected_user: User,
    ) -> User:
        try:
            payload = self._jwt_codec.decode(token)
        except JwtCodecError as exc:
            raise AuthError(str(exc)) from exc

        if payload.get("iss") != self._issuer:
            raise AuthError("Invalid token issuer")

        if payload.get("type") != expected_type:
            raise AuthError("Invalid token type")

        exp = payload.get("exp")
        if not isinstance(exp, int):
            raise AuthError("Invalid token expiry")

        if exp <= int(datetime.now(tz=timezone.utc).timestamp()):
            raise AuthError("Token has expired")

        subject = payload.get("sub")
        if subject != expected_user.id:
            raise AuthError("Unknown token subject")

        login = payload.get("login")
        if login != expected_user.login:
            raise AuthError("Unknown token subject")

        name = payload.get("name")
        if name is not None and not isinstance(name, str):
            raise AuthError("Invalid token payload")

        return expected_user

    def _encode_token(
        self,
        *,
        user: User,
        token_type: TokenType,
        ttl_seconds: int,
    ) -> str:
        now = datetime.now(tz=timezone.utc)
        payload: dict[str, Any] = {
            "sub": user.id,
            "login": user.login,
            "name": user.name,
            "type": token_type,
            "iss": self._issuer,
            "iat": int(now.timestamp()),
            "exp": int((now + timedelta(seconds=ttl_seconds)).timestamp()),
            "jti": str(uuid4()),
        }
        return self._jwt_codec.encode(payload)
