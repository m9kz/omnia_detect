import io

from app.domain.entities.raw_file import RawFile
from app.domain.entities.dataset_config import DatasetConfig

from app.domain.services.dataset_builder import DatasetBuilderService
from app.application.ports.dataset_writer import IDatasetWriter


class BuildDatasetUseCase:
    def __init__(
        self,
        builder_service: DatasetBuilderService,
        dataset_writer: IDatasetWriter
    ):
        self.builder_service = builder_service
        self.dataset_writer = dataset_writer
        
    def execute(
        self, 
        images: list[RawFile], 
        labels: list[RawFile], 
        config: DatasetConfig
    ) -> io.BytesIO:
        """
        1. Call the domain service to get the structured dataset.
        2. Call the writer to serialize the dataset into a byte stream.
        """
        
        yolo_dataset = self.builder_service.build_dataset(
            images=images,
            labels=labels,
            config=config
        )

        zip_buffer = self.dataset_writer.write_dataset(
            yolo_dataset
        )
        
        return zip_buffer
