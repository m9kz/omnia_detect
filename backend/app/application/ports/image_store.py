from typing import Protocol


class ImageStore(Protocol):
    def save(self, filename: str, content: bytes) -> tuple[int, int]:
        """Returns (width, height)."""
        ...

    def get(self, filename: str) -> tuple[bytes, int, int]:
        ...

