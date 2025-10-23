from dataclasses import dataclass


@dataclass
class YamlConfig:
    nc: int
    names: list[str]
    train: str = "images/train"
    val: str = "images/val"