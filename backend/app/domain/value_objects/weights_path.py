from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class WeightsPath:
    path: Path
    
    def __post_init__(self):
        if not self.path:
            raise ValueError("WeightsPath cannot be empty")
