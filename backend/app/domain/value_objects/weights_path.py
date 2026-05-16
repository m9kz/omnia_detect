from dataclasses import dataclass
from pathlib import Path

from app.domain.exceptions.base import ValidationException


@dataclass(frozen=True)
class WeightsPath:
    path: Path
    
    def __post_init__(self):
        if not self.path:
            raise ValidationException("WeightsPath cannot be empty")
