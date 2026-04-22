from __future__ import annotations

import base64
import hashlib
import hmac
import json
from typing import Any


class JwtCodecError(ValueError):
    pass


class JwtCodec:
    def __init__(self, secret: bytes) -> None:
        self._secret = secret

    def encode(self, payload: dict[str, Any]) -> str:
        header = {"alg": "HS256", "typ": "JWT"}

        header_segment = self._b64url_encode(
            json.dumps(header, separators=(",", ":"), sort_keys=True).encode("utf-8")
        )

        payload_segment = self._b64url_encode(
            json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
        )

        signing_input = (
            f"{header_segment}.{payload_segment}".encode("ascii")
        )

        signature_segment = self._b64url_encode(
            hmac.new(self._secret, signing_input, hashlib.sha256).digest()
        )

        return f"{header_segment}.{payload_segment}.{signature_segment}"

    def decode(self, token: str) -> dict[str, Any]:
        try:
            header_segment, payload_segment, signature_segment = token.split(".")
        except ValueError as exc:
            raise JwtCodecError("Malformed token") from exc

        signing_input = (
            f"{header_segment}.{payload_segment}".encode("ascii")
        )

        expected_signature = self._b64url_encode(
            hmac.new(self._secret, signing_input, hashlib.sha256).digest()
        )

        if not hmac.compare_digest(signature_segment, expected_signature):
            raise JwtCodecError("Invalid token signature")

        try:
            header: dict = json.loads(
                self._b64url_decode(header_segment)
            )
            payload: dict = json.loads(
                self._b64url_decode(payload_segment)
            )
        except (json.JSONDecodeError, ValueError) as exc:
            raise JwtCodecError("Malformed token payload") from exc

        if header.get("alg") != "HS256" or header.get("typ") != "JWT":
            raise JwtCodecError("Unsupported token format")

        if not isinstance(payload, dict):
            raise JwtCodecError("Malformed token payload")

        return payload

    @staticmethod
    def _b64url_encode(value: bytes) -> str:
        return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")

    @staticmethod
    def _b64url_decode(value: str) -> bytes:
        padding = "=" * (-len(value) % 4)
        return base64.urlsafe_b64decode(f"{value}{padding}")
