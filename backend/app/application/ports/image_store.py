from typing import Protocol


class ImageStore(Protocol):
    def save(self, filename: str, content: bytes) -> tuple[str,int,int]:
        """Returns (public_url, width, height)."""
        ...

