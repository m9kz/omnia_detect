from fastapi import Request, status
from fastapi.responses import JSONResponse

from app.domain.exceptions.base import (
    ConflictException,
    CriticalException,
    NotFoundException,
    OmniaException,
    TransientException,
    ValidationException,
)


def _status_code_for(exc: OmniaException) -> int:
    if isinstance(exc, ValidationException):
        return status.HTTP_400_BAD_REQUEST
    if isinstance(exc, NotFoundException):
        return status.HTTP_404_NOT_FOUND
    if isinstance(exc, ConflictException):
        return status.HTTP_409_CONFLICT
    if isinstance(exc, TransientException):
        return status.HTTP_503_SERVICE_UNAVAILABLE
    if isinstance(exc, CriticalException):
        return status.HTTP_500_INTERNAL_SERVER_ERROR

    return status.HTTP_500_INTERNAL_SERVER_ERROR


async def omnia_exception_handler(_: Request, exc: OmniaException) -> JSONResponse:
    detail = exc.message
    if isinstance(exc, CriticalException):
        detail = CriticalException.public_message

    return JSONResponse(
        status_code=_status_code_for(exc),
        content={
            "detail": detail,
            "error": exc.__class__.__name__,
        },
    )
