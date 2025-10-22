from dataclasses import dataclass
from app.domain.entities.raw_file import RawFile


@dataclass
class PairedData:
    image: RawFile
    label: RawFile