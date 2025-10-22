import io
import yaml
import zipfile

from app.domain.entities.yolo_dataset import YoloDataset
from app.domain.entities.paired_data import PairedData

from app.application.ports.dataset_writer import IDatasetWriter
from typing import List

from dataclasses import asdict

class ZipDatasetWriter(IDatasetWriter):
    """
    This is the concrete implementation of the IDatasetWriter.
    It knows about external libraries like 'zipfile' and 'yaml'.
    All the "dirty" infrastructure details live here.
    """

    def _add_files_to_zip(
        self, 
        zip_file: zipfile.ZipFile, 
        data_list: List[PairedData], 
        split_name: str
    ):
        for pair in data_list:
            img_zip_path = f"images/{split_name}/{pair.image.filename}"
            lbl_zip_path = f"labels/{split_name}/{pair.label.filename}"
            
            zip_file.writestr(img_zip_path, pair.image.content)
            zip_file.writestr(lbl_zip_path, pair.label.content)

    def write_dataset(self, dataset: YoloDataset) -> io.BytesIO:
        yaml_dict = asdict(dataset.yaml_config)
        yaml_content = yaml.dump(yaml_dict, sort_keys=False, default_flow_style=False)
        buffer = io.BytesIO()
    
        with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            zip_file.writestr(
                "data.yaml", 
                yaml_content
            )
            
            self._add_files_to_zip(
                zip_file, 
                dataset.split_dataset.train, 
                'train'
            )
            
            self._add_files_to_zip(
                zip_file, 
                dataset.split_dataset.val, 
                'val'
            )

        buffer.seek(0)
        return buffer
