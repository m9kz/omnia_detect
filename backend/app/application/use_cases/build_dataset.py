from datetime import datetime, timezone
from uuid import uuid4

from app.application.ports.dataset_store import DatasetStore
from app.application.ports.dataset_writer import IDatasetWriter
from app.application.ports.uow import UnitOfWork
from app.domain.entities.dataset_artifact import DatasetArtifact
from app.domain.entities.dataset_config import DatasetConfig
from app.domain.entities.raw_file import RawFile
from app.domain.services.dataset_builder import DatasetBuilderService


class BuildDatasetUseCase:
    def __init__(
        self,
        builder_service: DatasetBuilderService,
        dataset_writer: IDatasetWriter,
        store: DatasetStore,
        uow: UnitOfWork,
    ):
        self.builder_service = builder_service
        self.dataset_writer = dataset_writer
        self.store = store
        self.uow = uow
        
    def execute(
        self, 
        images: list[RawFile], 
        labels: list[RawFile], 
        config: DatasetConfig
    ) -> DatasetArtifact:
        """
        1. Call the domain service to get the structured dataset.
        2. Call the writer to serialize the dataset into a byte stream.
        """
        
        yolo_dataset = self.builder_service.build_dataset(
            images=images, labels=labels, config=config
        )

        zip_buffer = self.dataset_writer.write_dataset(yolo_dataset)
        zip_bytes = zip_buffer.getvalue()

        ds_id = uuid4()
        zip_relpath = self.store.save(ds_id, zip_bytes)

        num_pairs = (
            len(yolo_dataset.split_dataset.train) + len(yolo_dataset.split_dataset.val)
        )
        artifact = DatasetArtifact(
            id=ds_id,
            class_names=yolo_dataset.yaml_config.names,
            ratio=config.ratio,
            num_pairs=num_pairs,
            train_count=len(yolo_dataset.split_dataset.train),
            val_count=len(yolo_dataset.split_dataset.val),
            zip_relpath=zip_relpath,
            created_at=datetime.now(timezone.utc)
        )

        with self.uow as u:
            u.datasets.add(artifact)
            u.commit()
        
        return artifact
