from dataclasses import dataclass, field
from uuid import UUID

from datetime import datetime, timezone


@dataclass
class Identity:
    id: UUID
    name: str
    created_at: datetime = field(default_factory=datetime.now(timezone.utc))