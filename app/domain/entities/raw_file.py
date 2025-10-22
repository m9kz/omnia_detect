from dataclasses import dataclass


@dataclass
class RawFile:
    filename: str
    content: bytes

    @property
    def stem(self) -> str:
        return self.filename.rsplit('.', 1)[0]