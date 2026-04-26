from __future__ import annotations

import base64
import binascii
import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Literal
from uuid import uuid4

from app.domain.entities.auth_session import AuthSession
from app.domain.entities.user import User
from app.domain.exceptions.auth import AuthError
from app.shared.security.jwt import JwtCodec, JwtCodecError

TokenType = Literal["access", "refresh"]

PASSWORD_HASH_ALGORITHM = "pbkdf2_sha256"
PASSWORD_HASH_ITERATIONS = 600_000
PASSWORD_SALT_BYTES = 16


def _encode_bytes(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


def _decode_bytes(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


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

    def hash_password(self, password: str) -> str:
        salt = os.urandom(PASSWORD_SALT_BYTES)
        password_hash = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt,
            PASSWORD_HASH_ITERATIONS,
        )

        return "$".join(
            [
                PASSWORD_HASH_ALGORITHM,
                str(PASSWORD_HASH_ITERATIONS),
                _encode_bytes(salt),
                _encode_bytes(password_hash),
            ]
        )

    def verify_password(self, password: str, password_hash: str) -> bool:
        try:
            algorithm, iterations_value, salt_value, hash_value = password_hash.split("$", 3)
            iterations = int(iterations_value)
            salt = _decode_bytes(salt_value)
            expected_hash = _decode_bytes(hash_value)
        except (TypeError, ValueError, binascii.Error):
            return False

        if algorithm != PASSWORD_HASH_ALGORITHM or iterations <= 0:
            return False

        candidate_hash = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt,
            iterations,
        )

        return hmac.compare_digest(candidate_hash, expected_hash)

    def authenticate(self, *, user: User | None, password: str) -> User:
        if user is None:
            raise AuthError("Invalid login or password")

        if not self.verify_password(password, user.password_hash):
            raise AuthError("Invalid login or password")

        return user

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

    def refresh_session(self, refresh_token: str, user: User | None) -> AuthSession:
        user = self.verify_refresh_token(refresh_token, user)
        return self.issue_session(user)

    def verify_access_token(self, access_token: str, user: User | None) -> User:
        return self._verify_token(
            access_token,
            expected_type="access",
            user=user,
        )

    def verify_refresh_token(self, refresh_token: str, user: User | None) -> User:
        return self._verify_token(
            refresh_token,
            expected_type="refresh",
            user=user,
        )

    def read_token_subject(self, token: str, *, expected_type: TokenType) -> str:
        payload = self._decode_verified_payload(token, expected_type=expected_type)
        subject = payload.get("sub")
        if not isinstance(subject, str) or not subject:
            raise AuthError("Invalid token payload")

        return subject

    def _verify_token(
        self,
        token: str,
        *,
        expected_type: TokenType,
        user: User | None,
    ) -> User:
        payload = self._decode_verified_payload(token, expected_type=expected_type)

        subject = payload.get("sub")
        if not isinstance(subject, str) or user is None or subject != user.id:
            raise AuthError("Unknown token subject")

        login = payload.get("login")
        if login != user.login:
            raise AuthError("Unknown token subject")

        name = payload.get("name")
        if name is not None and not isinstance(name, str):
            raise AuthError("Invalid token payload")

        return user

    def _decode_verified_payload(
        self,
        token: str,
        *,
        expected_type: TokenType,
    ) -> dict[str, Any]:
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

        return payload

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
