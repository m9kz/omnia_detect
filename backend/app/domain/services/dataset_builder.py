import random

from app.domain.entities.dataset_config import DatasetConfig
from app.domain.entities.paired_data import PairedData
from app.domain.entities.raw_file import RawFile
from app.domain.entities.split_dataset import SplitDataset
from app.domain.entities.yaml_config import YamlConfig
from app.domain.entities.yolo_dataset import YoloDataset

RANDOM_SEED = 42

class DatasetBuilderService:
    IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
    LABEL_EXTS = {".txt"}

    @staticmethod
    def _ext(name: str) -> str:
        return "." + name.rsplit(".", 1)[-1].lower() if "." in name else ""

    @staticmethod
    def _format_names(names: list[str]) -> str:
        preview = ", ".join(names[:5])
        suffix = "..." if len(names) > 5 else ""
        return f"{preview}{suffix}"

    @staticmethod
    def _find_duplicate_stems(files: list[RawFile]) -> list[str]:
        seen: set[str] = set()
        duplicates: set[str] = set()

        for file in files:
            if file.stem in seen:
                duplicates.add(file.stem)
            seen.add(file.stem)

        return sorted(duplicates)

    def _pair_files(self, images: list[RawFile], labels: list[RawFile]) -> list[PairedData]:
        """
        Pairs images and labels based on their file stem.
        """
        images = [
            image 
            for image 
            in images 
            if self._ext(image.filename) in self.IMAGE_EXTS
        ]
        
        labels = [
            label 
            for label 
            in labels 
            if self._ext(label.filename) in self.LABEL_EXTS
        ]

        if not images:
            raise ValueError("No supported image files were provided.")
        
        if not labels:
            raise ValueError("No supported label files were provided.")

        duplicate_images = self._find_duplicate_stems(images)
        if duplicate_images:
            raise ValueError(
                "Duplicate image stems are not allowed: "
                f"{self._format_names(duplicate_images)}"
            )

        duplicate_labels = self._find_duplicate_stems(labels)
        if duplicate_labels:
            raise ValueError(
                "Duplicate label stems are not allowed: "
                f"{self._format_names(duplicate_labels)}"
            )

        label_map = {lbl.stem: lbl for lbl in labels}
        image_stems = {img.stem for img in images}
        missing_labels = [img.filename for img in images if img.stem not in label_map]
        orphan_labels = [label.filename for label in labels if label.stem not in image_stems]

        if missing_labels or orphan_labels:
            problems: list[str] = []
            if missing_labels:
                problems.append(
                    "missing labels for image files: "
                    f"{self._format_names(missing_labels)}"
                )
            if orphan_labels:
                problems.append(
                    "label files without matching images: "
                    f"{self._format_names(orphan_labels)}"
                )

            raise ValueError(
                "Dataset files must match one-to-one by filename stem; "
                + "; ".join(problems)
            )

        paired_data = [PairedData(image=img, label=label_map[img.stem]) for img in images]
        if not paired_data:
            raise ValueError("No matching image/label pairs were found.")

        return paired_data

    def _split_data(self, paired_data: list[PairedData], ratio: float) -> SplitDataset:
        """
        Shuffles and splits the paired data.
        """
        if len(paired_data) < 2:
            raise ValueError("At least 2 image/label pairs are required to create a train/validation split.")
        
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
            names=class_names,
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
            yaml_config=yaml_config,
        )
