from dataclasses import dataclass

from app.domain.exceptions.base import ValidationException


@dataclass(frozen=True)
class BBox:  # normalized [0..1]
    x: float
    y: float
    w: float
    h: float

    def __post_init__(self) -> None:
        values = {"x": self.x, "y": self.y, "w": self.w, "h": self.h}
        for name, value in values.items():
            if not 0.0 <= value <= 1.0:
                raise ValidationException(f"bbox.{name} must be between 0 and 1")

        if self.w <= 0.0 or self.h <= 0.0:
            raise ValidationException("bbox width and height must be greater than 0")

        if self.x + self.w > 1.0 or self.y + self.h > 1.0:
            raise ValidationException("bbox must fit within normalized image bounds")
