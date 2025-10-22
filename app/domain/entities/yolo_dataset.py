from dataclasses import dataclass

from app.domain.entities.split_dataset import SplitDataset
from app.domain.entities.yaml_config import YamlConfig


@dataclass
class YoloDataset:
    split_dataset: SplitDataset
    yaml_config: YamlConfig