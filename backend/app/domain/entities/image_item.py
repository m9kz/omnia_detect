from dataclasses import dataclass, field
from datetime import datetime, timezone
from uuid import UUID


@dataclass
class ImageItem:
    id: UUID
    user_id: str
    url: str
    width: int
    height: int
    filename: str
    uploaded_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
