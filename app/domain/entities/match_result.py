from dataclasses import dataclass
from uuid import UUID

from app.domain.entities.label import Label


@dataclass
class MatchResult:
    detection: Label
    matched_identity_id: UUID | None
    matched_identity_name: str | None
    similarity: float | None
