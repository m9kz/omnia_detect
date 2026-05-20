class OmniaException(Exception):
    """Base exception for expected Omnia domain/application failures."""

    public_message = "Application error"

    def __init__(self, message: str | None = None) -> None:
        self.message = message or self.public_message
        super().__init__(self.message)


class ValidationException(OmniaException):
    public_message = "Validation failed"


class NotFoundException(OmniaException):
    public_message = "Resource not found"


class ConflictException(OmniaException):
    public_message = "Resource conflict"


class QuotaExceededException(ConflictException):
    public_message = "Storage quota exceeded"


class TransientException(OmniaException):
    public_message = "Temporary service failure"


class CriticalException(OmniaException):
    public_message = "Internal application failure"
