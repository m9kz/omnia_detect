import io
from abc import ABC, abstractmethod
from app.domain.entities.yolo_dataset import YoloDataset

class IDatasetWriter(ABC):
    
    @abstractmethod
    def write_dataset(self, dataset: YoloDataset) -> io.BytesIO:
        """
        Takes a complete YoloDataset domain object and writes it
        to an in-memory byte buffer.
        """
        ...
