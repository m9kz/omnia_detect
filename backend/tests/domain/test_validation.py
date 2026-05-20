from datetime import datetime, timezone
from uuid import uuid4

import pytest

from app.domain.entities.dataset_artifact import DatasetArtifact
from app.domain.entities.dataset_config import DatasetConfig
from app.domain.entities.model_artifact import ModelArtifact
from app.domain.entities.train_job import TrainJob
from app.domain.exceptions.auth import AuthError
from app.domain.exceptions.base import OmniaException, QuotaExceededException, ValidationException
from app.domain.value_objects.bbox import BBox
from app.domain.value_objects.storage_quota import StorageQuotaSnapshot


def test_dataset_config_normalizes_class_names():
    config = DatasetConfig(ratio=0.75, class_names=[" cat ", "dog"])

    assert config.class_names == ["cat", "dog"]


@pytest.mark.parametrize(
    ("ratio", "class_names", "message"),
    [
        (0, ["cat"], "ratio"),
        (1, ["cat"], "ratio"),
        (0.5, [], "class_names"),
        (0.5, ["cat", "cat"], "duplicates"),
    ],
)
def test_dataset_config_rejects_invalid_values(ratio, class_names, message):
    with pytest.raises(ValidationException, match=message):
        DatasetConfig(ratio=ratio, class_names=class_names)


def test_bbox_accepts_normalized_box():
    bbox = BBox(x=0.1, y=0.2, w=0.3, h=0.4)

    assert bbox.x == 0.1


@pytest.mark.parametrize(
    "bbox",
    [
        {"x": -0.1, "y": 0.2, "w": 0.3, "h": 0.4},
        {"x": 0.1, "y": 0.2, "w": 0, "h": 0.4},
        {"x": 0.8, "y": 0.2, "w": 0.3, "h": 0.4},
        {"x": 0.1, "y": 0.8, "w": 0.3, "h": 0.4},
    ],
)
def test_bbox_rejects_invalid_values(bbox):
    with pytest.raises(ValidationException):
        BBox(**bbox)


def test_artifact_rename_trims_and_limits_names():
    dataset = DatasetArtifact(
        id=uuid4(),
        user_id="user-1",
        name="Old",
        class_names=["cat"],
        ratio=0.5,
        num_pairs=2,
        train_count=1,
        val_count=1,
        zip_relpath="dataset.zip",
        size_bytes=1024,
    )
    model = ModelArtifact(
        id=uuid4(),
        user_id="user-1",
        name="Old",
        dataset_id=dataset.id,
        base_weights="base.pt",
        best_weights_path="best.pt",
        epochs=5,
        imgsz=640,
        metrics_path=None,
        size_bytes=2048,
    )

    dataset.rename("  " + "d" * 90 + "  ")
    model.rename("  " + "m" * 90 + "  ")

    assert dataset.name == "d" * 80
    assert model.name == "m" * 80


@pytest.mark.parametrize("artifact", ["dataset", "model"])
def test_artifact_rename_rejects_blank_names(artifact):
    if artifact == "dataset":
        value = DatasetArtifact(
            id=uuid4(),
            user_id="user-1",
            name="Old",
            class_names=["cat"],
            ratio=0.5,
            num_pairs=2,
            train_count=1,
            val_count=1,
            zip_relpath="dataset.zip",
            size_bytes=1024,
        )
    else:
        value = ModelArtifact(
            id=uuid4(),
            user_id="user-1",
            name="Old",
            dataset_id=uuid4(),
            base_weights="base.pt",
            best_weights_path="best.pt",
            epochs=5,
            imgsz=640,
            metrics_path=None,
            size_bytes=2048,
        )

    with pytest.raises(ValidationException):
        value.rename(" ")


def test_train_job_validates_invariants():
    with pytest.raises(ValidationException, match="progress"):
        TrainJob(
            id=uuid4(),
            user_id="user-1",
            dataset_id=uuid4(),
            status="queued",
            progress=101,
            current_epoch=0,
            total_epochs=5,
            epochs=5,
            imgsz=640,
            base_weights="base.pt",
            base_model_id=None,
            model_id=None,
            model_name=None,
            message=None,
            error=None,
            created_at=datetime.now(timezone.utc),
        )


def test_storage_quota_snapshot_calculates_remaining_and_rejects_overage():
    snapshot = StorageQuotaSnapshot(used_bytes=400, quota_bytes=1000)

    assert snapshot.remaining_bytes == 600
    snapshot.ensure_can_add(600)

    with pytest.raises(QuotaExceededException):
        snapshot.ensure_can_add(601)


@pytest.mark.parametrize(
    ("used_bytes", "quota_bytes", "size_bytes"),
    [
        (-1, 100, 1),
        (0, -1, 1),
        (0, 100, -1),
    ],
)
def test_storage_quota_snapshot_rejects_negative_values(used_bytes, quota_bytes, size_bytes):
    if used_bytes < 0 or quota_bytes < 0:
        with pytest.raises(ValidationException):
            StorageQuotaSnapshot(used_bytes=used_bytes, quota_bytes=quota_bytes)
        return

    with pytest.raises(ValidationException):
        StorageQuotaSnapshot(used_bytes=used_bytes, quota_bytes=quota_bytes).ensure_can_add(size_bytes)


def test_auth_error_is_omnia_exception():
    exc = AuthError("Nope")

    assert isinstance(exc, OmniaException)
    assert exc.message == "Nope"
