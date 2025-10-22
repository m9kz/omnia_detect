from dataclasses import dataclass


@dataclass(frozen=True)
class BBox:  # normalized [0..1]
    x: float
    y: float
    w: float
    h: float