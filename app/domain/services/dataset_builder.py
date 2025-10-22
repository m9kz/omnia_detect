import random

from app.domain.entities.raw_file import RawFile
from app.domain.entities.dataset_config import DatasetConfig
from app.domain.entities.paired_data import PairedData
from app.domain.entities.split_dataset import SplitDataset
from app.domain.entities.yaml_config import YamlConfig
from app.domain.entities.yolo_dataset import YoloDataset

RANDOM_SEED = 42

class DatasetBuilderService:
    """
    This service contains the PURE business logic.
    It has no knowledge of FastAPI, zip files, or HTTP requests.
    Its job is to take raw data and configuration, and return a
    structured YoloDataset object.
    """

    IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
    LABEL_EXTS = {".txt"}

    @staticmethod
    def _ext(name: str) -> str:
        return "." + name.rsplit(".", 1)[-1].lower() if "." in name else ""

    def _pair_files(self, images: list[RawFile], labels: list[RawFile]) -> list[PairedData]:
        """
        Pairs images and labels based on their file stem.
        """
        images = [i for i in images if self._ext(i.filename) in self.IMAGE_EXTS]
        labels = [l for l in labels if self._ext(l.filename) in self.LABEL_EXTS]
        
        label_map = {lbl.stem: lbl for lbl in labels}
        paired_data: list[PairedData] = []
        missing = []
        
        for img in images:
            label = label_map.get(img.stem)
            if not label:
                missing.append(img.filename)
            
            paired_data.append(PairedData(image=img, label=label))
                
        if not paired_data:
            raise ValueError("No matching image/label pairs were found.")
        
        if missing:
            print(f"Warning: {len(missing)} images had no matching label: {missing[:5]}...")
            
        return paired_data

    def _split_data(self, paired_data: list[PairedData], ratio: float) -> SplitDataset:
        """
        Shuffles and splits the paired data.
        """
        if not (0.0 < ratio < 1.0):
            raise ValueError("ratio must be between 0 and 1 (exclusive)")
        
        rnd = random.Random(RANDOM_SEED)
        rnd.shuffle(paired_data)
        split_index = int(len(paired_data) * ratio)
        split_index = max(1, min(split_index, len(paired_data) - 1))
        
        train_pairs = paired_data[:split_index]
        val_pairs = paired_data[split_index:]
        
        return SplitDataset(train=train_pairs, val=val_pairs)

    def _generate_yaml_config(self, class_names: list[str]) -> YamlConfig:
        """
        Creates the configuration object for the data.yaml file.
        """
        if not class_names:
            raise ValueError("class_names cannot be empty")

        return YamlConfig(
            nc=len(class_names),
            names=class_names
        )

    def build_dataset(
        self, 
        images: list[RawFile], 
        labels: list[RawFile], 
        config: DatasetConfig
    ) -> YoloDataset:
        """
        The main public method that orchestrates the domain logic.
        """
        paired_data = self._pair_files(images, labels)
        split_dataset = self._split_data(paired_data, config.ratio)
        yaml_config = self._generate_yaml_config(config.class_names)
        
        return YoloDataset(
            split_dataset=split_dataset,
            yaml_config=yaml_config
        )
