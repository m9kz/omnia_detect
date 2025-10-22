from dataclasses import dataclass
from app.domain.entities.paired_data import PairedData


@dataclass
class SplitDataset:
    train: list[PairedData]
    val: list[PairedData]