from dataclasses import dataclass

from app.domain.exceptions.base import ValidationException


@dataclass
class DatasetConfig:
    ratio: float
    class_names: list[str]

    def __post_init__(self) -> None:
        if not (0.0 < self.ratio < 1.0):
            raise ValidationException("ratio must be between 0 and 1 (exclusive)")

        names = [name.strip() for name in self.class_names if name.strip()]
        if not names:
            raise ValidationException("class_names cannot be empty")

        if len(set(names)) != len(names):
            raise ValidationException("class_names cannot contain duplicates")

        self.class_names = names
