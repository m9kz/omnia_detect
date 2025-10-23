from dataclasses import dataclass, field
from datetime import datetime, timezone
from uuid import UUID


@dataclass
class ImageItem:
    id: UUID
    url: str
    width: int
    height: int
    filename: str
    uploaded_at: datetime = field(default_factory=datetime.now(timezone.utc))
