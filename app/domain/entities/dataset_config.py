from dataclasses import dataclass


@dataclass
class DatasetConfig:
    ratio: float
    class_names: list[str]