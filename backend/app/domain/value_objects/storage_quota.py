from dataclasses import dataclass

from app.domain.exceptions.base import QuotaExceededException, ValidationException


@dataclass(frozen=True)
class StorageQuotaSnapshot:
    used_bytes: int
    quota_bytes: int

    def __post_init__(self) -> None:
        if self.used_bytes < 0:
            raise ValidationException("used_bytes cannot be negative")

        if self.quota_bytes < 0:
            raise ValidationException("quota_bytes cannot be negative")

    @property
    def remaining_bytes(self) -> int:
        return max(0, self.quota_bytes - self.used_bytes)

    def ensure_can_add(self, size_bytes: int) -> None:
        if size_bytes < 0:
            raise ValidationException("size_bytes cannot be negative")

        if size_bytes > self.remaining_bytes:
            raise QuotaExceededException(
                "Недостатньо місця у сховищі для створення ресурсу"
            )
