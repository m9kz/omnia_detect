from dataclasses import dataclass


@dataclass(frozen=True)
class User:
    id: str
    login: str
    name: str | None
