import pytest

from app.domain.entities.dataset_config import DatasetConfig
from app.domain.entities.raw_file import RawFile
from app.domain.exceptions.base import ValidationException
from app.domain.services.dataset_builder import DatasetBuilderService


def raw_file(filename: str, content: bytes = b"content") -> RawFile:
    return RawFile(filename=filename, content=content)


def test_build_dataset_pairs_splits_and_generates_yaml():
    service = DatasetBuilderService()
    images = [
        raw_file("a.jpg"),
        raw_file("b.png"),
        raw_file("ignored.gif"),
        raw_file("c.webp"),
    ]
    labels = [
        raw_file("a.txt"),
        raw_file("b.txt"),
        raw_file("c.txt"),
    ]

    dataset = service.build_dataset(
        images=images,
        labels=labels,
        config=DatasetConfig(ratio=0.67, class_names=["cat", "dog"]),
    )

    assert len(dataset.split_dataset.train) == 2
    assert len(dataset.split_dataset.val) == 1
    assert dataset.yaml_config.nc == 2
    assert dataset.yaml_config.names == ["cat", "dog"]


@pytest.mark.parametrize(
    ("images", "labels", "message"),
    [
        ([raw_file("a.gif")], [raw_file("a.txt")], "No supported image"),
        ([raw_file("a.jpg")], [raw_file("a.json")], "No supported label"),
        ([raw_file("a.jpg"), raw_file("a.png")], [raw_file("a.txt")], "Duplicate image"),
        ([raw_file("a.jpg")], [raw_file("a.txt"), raw_file("a.txt")], "Duplicate label"),
        ([raw_file("a.jpg"), raw_file("b.jpg")], [raw_file("a.txt")], "one-to-one"),
    ],
)
def test_pair_files_rejects_invalid_dataset_inputs(images, labels, message):
    service = DatasetBuilderService()

    with pytest.raises(ValidationException, match=message):
        service._pair_files(images, labels)


def test_split_requires_at_least_two_pairs():
    service = DatasetBuilderService()
    pairs = service._pair_files([raw_file("a.jpg")], [raw_file("a.txt")])

    with pytest.raises(ValidationException, match="At least 2"):
        service._split_data(pairs, ratio=0.8)


def test_split_rejects_invalid_ratio():
    service = DatasetBuilderService()
    pairs = service._pair_files(
        [raw_file("a.jpg"), raw_file("b.jpg")],
        [raw_file("a.txt"), raw_file("b.txt")],
    )

    with pytest.raises(ValidationException, match="ratio"):
        service._split_data(pairs, ratio=1.0)
