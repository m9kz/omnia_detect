import asyncio
from io import BytesIO
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.application.use_cases.build_dataset import BuildDatasetUseCase
from app.application.use_cases.create_train_job import CreateTrainJobUseCase
from app.application.use_cases.detect import DetectUseCase
from app.application.use_cases.get_image import GetImageUseCase
from app.application.use_cases.get_storage_usage import GetStorageUsageUseCase
from app.application.use_cases.reload import ReloadModelUseCase
from app.application.use_cases.rename_dataset import RenameDatasetUseCase
from app.application.use_cases.rename_model import RenameModelUseCase
from app.application.use_cases.rollback import RollbackModelUseCase
from app.application.use_cases.train import TrainModelUseCase
from app.application.use_cases.update import UpdateWeightsUseCase
from app.application.use_cases.upload import UploadImageUseCase
from app.domain.entities.dataset_config import DatasetConfig
from app.domain.entities.label import Label
from app.domain.entities.raw_file import RawFile
from app.domain.exceptions.base import NotFoundException, QuotaExceededException, TransientException, ValidationException
from app.domain.services.dataset_builder import DatasetBuilderService
from app.domain.value_objects.bbox import BBox
from conftest import FakeUow, make_dataset, make_image, make_model


USER_ID = "user-1"


class FakeDatasetWriter:
    def __init__(self):
        self.dataset = None

    def write_dataset(self, dataset):
        self.dataset = dataset
        return BytesIO(b"zip-bytes")


class FakeDatasetStore:
    def __init__(self, *, fail=False):
        self.fail = fail
        self.saved = None

    def save(self, dataset_id, zip_bytes):
        if self.fail:
            raise OSError("disk full")
        self.saved = (dataset_id, zip_bytes)
        return f"data/datasets/{dataset_id}/dataset.zip"


class FakeImageStore:
    def __init__(self, *, save_result=(320, 240), content=b"image", fail=None):
        self.save_result = save_result
        self.content = content
        self.fail = fail
        self.saved = None

    def save(self, filename, content):
        if self.fail == "save":
            raise OSError("disk full")
        self.saved = (filename, content)
        return self.save_result

    def get(self, filename):
        if self.fail == "missing":
            raise FileNotFoundError(filename)
        if self.fail == "read":
            raise OSError("cannot read")
        return self.content, self.save_result[0], self.save_result[1]


class FakeWeightsRepo:
    def __init__(self, *, fail=None):
        self.fail = fail
        self.added_path = None

    def get(self):
        if self.fail == "missing":
            raise FileNotFoundError("current.pt")
        return SimpleNamespace(path="current.pt")

    def add(self, new_weights):
        if self.fail == "missing":
            raise FileNotFoundError(new_weights)
        if self.fail == "invalid":
            raise ValueError("bad weights")
        if self.fail == "os":
            raise OSError("cannot write")
        self.added_path = new_weights
        return SimpleNamespace(path="ml_models/current.pt")


class FakeLoader:
    def __init__(self):
        self.loaded = None

    def load(self, weights):
        self.loaded = weights
        return SimpleNamespace(version="v1")


class FakeSwapper:
    def __init__(self, current=None, previous=None):
        self.current = current or SimpleNamespace(_weights_path="base.pt", _model_id=None)
        self.previous = previous
        self.swapped = None

    def get_current(self):
        return self.current

    def swap(self, new_model):
        self.swapped = new_model

    def rollback(self):
        return self.previous


class FakeDispatcher:
    def __init__(self):
        self.submitted = []

    def submit(self, job_id):
        self.submitted.append(job_id)


class FakeTrainer:
    def __init__(self):
        self.calls = []
        self.model_id = uuid4()

    def train(self, **kwargs):
        self.calls.append(kwargs)
        return self.model_id, "best.pt", "metrics.csv", 4096


class FakeDetector:
    def detect(self, model, image_bytes):
        return [
            Label(
                id=uuid4(),
                image_id=uuid4(),
                class_name="cat",
                confidence=0.9,
                bbox=BBox(0.1, 0.1, 0.2, 0.2),
            )
        ]


def raw_file(filename: str) -> RawFile:
    return RawFile(filename=filename, content=b"content")


def test_build_dataset_persists_artifact_with_optional_name():
    uow = FakeUow()
    writer = FakeDatasetWriter()
    store = FakeDatasetStore()
    use_case = BuildDatasetUseCase(
        builder_service=DatasetBuilderService(),
        dataset_writer=writer,
        store=store,
        uow=uow,
    )

    artifact = use_case.execute(
        user_id=USER_ID,
        images=[raw_file("a.jpg"), raw_file("b.jpg")],
        labels=[raw_file("a.txt"), raw_file("b.txt")],
        config=DatasetConfig(0.5, ["cat"]),
        name="  Training Set  ",
    )

    assert artifact.name == "Training Set"
    assert artifact.num_pairs == 2
    assert artifact.user_id == USER_ID
    assert artifact.size_bytes == len(b"zip-bytes")
    assert store.saved[1] == b"zip-bytes"
    assert uow.datasets.added == artifact
    assert uow.commits == 1


def test_build_dataset_translates_store_failure():
    uow = FakeUow()
    use_case = BuildDatasetUseCase(
        builder_service=DatasetBuilderService(),
        dataset_writer=FakeDatasetWriter(),
        store=FakeDatasetStore(fail=True),
        uow=uow,
    )

    with pytest.raises(TransientException, match="archive"):
        use_case.execute(
            user_id=USER_ID,
            images=[raw_file("a.jpg"), raw_file("b.jpg")],
            labels=[raw_file("a.txt"), raw_file("b.txt")],
            config=DatasetConfig(0.5, ["cat"]),
        )


def test_build_dataset_rejects_when_user_storage_quota_is_exceeded(monkeypatch):
    monkeypatch.setattr(
        "app.application.use_cases.build_dataset.settings.USER_STORAGE_QUOTA_BYTES",
        4,
    )
    use_case = BuildDatasetUseCase(
        builder_service=DatasetBuilderService(),
        dataset_writer=FakeDatasetWriter(),
        store=FakeDatasetStore(),
        uow=FakeUow(),
    )

    with pytest.raises(QuotaExceededException):
        use_case.execute(
            user_id=USER_ID,
            images=[raw_file("a.jpg"), raw_file("b.jpg")],
            labels=[raw_file("a.txt"), raw_file("b.txt")],
            config=DatasetConfig(0.5, ["cat"]),
        )


def test_rename_use_cases_raise_not_found_and_commit_success():
    dataset = make_dataset()
    model = make_model()
    uow = FakeUow(datasets={dataset.id: dataset}, models={model.id: model})

    assert RenameDatasetUseCase(uow).execute(USER_ID, dataset.id, "New Dataset").name == "New Dataset"
    assert RenameModelUseCase(uow).execute(USER_ID, model.id, "New Model").name == "New Model"
    assert uow.commits == 2

    with pytest.raises(NotFoundException):
        RenameDatasetUseCase(FakeUow()).execute(USER_ID, uuid4(), "Missing")

    with pytest.raises(NotFoundException):
        RenameModelUseCase(FakeUow()).execute(USER_ID, uuid4(), "Missing")


def test_create_train_job_validates_dataset_and_dispatches_job():
    dataset = make_dataset()
    base_model_id = uuid4()
    base_model = make_model(id=base_model_id)
    uow = FakeUow(datasets={dataset.id: dataset}, models={base_model.id: base_model})
    dispatcher = FakeDispatcher()
    use_case = CreateTrainJobUseCase(
        uow=uow,
        swapper=FakeSwapper(SimpleNamespace(_weights_path="base.pt", _model_id=str(base_model_id))),
        dispatcher=dispatcher,
    )

    job = use_case.execute(USER_ID, dataset.id, epochs=3, imgsz=128, model_name=" Demo Model ")

    assert job.dataset_id == dataset.id
    assert job.user_id == USER_ID
    assert job.base_model_id == base_model_id
    assert job.model_name == "Demo Model"
    assert dispatcher.submitted == [job.id]
    assert uow.jobs.added == job

    with pytest.raises(ValidationException):
        use_case.execute(USER_ID, dataset.id, epochs=0)

    with pytest.raises(NotFoundException):
        CreateTrainJobUseCase(FakeUow(), FakeSwapper(), FakeDispatcher()).execute(USER_ID, uuid4())


def test_train_model_use_case_uses_current_weights_and_persists_model():
    dataset = make_dataset(zip_relpath="dataset.zip")
    uow = FakeUow(datasets={dataset.id: dataset})
    trainer = FakeTrainer()
    use_case = TrainModelUseCase(trainer=trainer, swapper=FakeSwapper(), uow=uow)

    artifact = use_case.execute(USER_ID, dataset.id, epochs=2, imgsz=64, name=" Fine Tuned ")

    assert artifact.id == trainer.model_id
    assert artifact.name == "Fine Tuned"
    assert artifact.user_id == USER_ID
    assert artifact.size_bytes == 4096
    assert artifact.best_weights_path == "best.pt"
    assert trainer.calls[0]["zip_path"] == "dataset.zip"
    assert uow.models.added == artifact

    with pytest.raises(NotFoundException):
        TrainModelUseCase(trainer, FakeSwapper(), FakeUow()).execute(USER_ID, uuid4())


def test_train_model_rejects_when_user_storage_quota_is_exceeded(monkeypatch):
    monkeypatch.setattr(
        "app.application.use_cases.train.settings.USER_STORAGE_QUOTA_BYTES",
        128,
    )
    dataset = make_dataset(zip_relpath="dataset.zip")

    with pytest.raises(QuotaExceededException):
        TrainModelUseCase(
            trainer=FakeTrainer(),
            swapper=FakeSwapper(),
            uow=FakeUow(datasets={dataset.id: dataset}),
        ).execute(USER_ID, dataset.id)


def test_get_storage_usage_returns_user_scoped_quota_snapshot():
    dataset = make_dataset(size_bytes=100)
    model = make_model(dataset_id=dataset.id, size_bytes=250)
    other_model = make_model(user_id="other-user", size_bytes=900)
    usage = GetStorageUsageUseCase(
        uow=FakeUow(
            datasets={dataset.id: dataset},
            models={model.id: model, other_model.id: other_model},
        ),
        quota_bytes=1000,
    ).execute(USER_ID)

    assert usage.dataset_bytes == 100
    assert usage.model_bytes == 250
    assert usage.used_bytes == 350
    assert usage.remaining_bytes == 650


def test_update_weights_translates_repository_failures():
    model = make_model(best_weights_path="missing.pt")

    with pytest.raises(NotFoundException):
        UpdateWeightsUseCase(FakeWeightsRepo(), FakeUow()).execute(USER_ID, uuid4())

    with pytest.raises(TransientException):
        UpdateWeightsUseCase(
            FakeWeightsRepo(fail="missing"),
            FakeUow(models={model.id: model}),
        ).execute(USER_ID, model.id)

    with pytest.raises(ValidationException, match="bad weights"):
        UpdateWeightsUseCase(
            FakeWeightsRepo(fail="invalid"),
            FakeUow(models={model.id: model}),
        ).execute(USER_ID, model.id)


def test_upload_image_validates_and_persists_image():
    uow = FakeUow()
    store = FakeImageStore()
    dto = UploadImageUseCase(uow=uow, store=store).execute(USER_ID, "demo.jpg", b"bytes")

    assert dto.width == 320
    assert dto.height == 240
    assert dto.filename == "demo.jpg"
    assert uow.images.added.filename == "demo.jpg"
    assert uow.images.added.user_id == USER_ID
    assert uow.commits == 1

    with pytest.raises(ValidationException, match="Empty"):
        UploadImageUseCase(uow=FakeUow(), store=store).execute(USER_ID, "demo.jpg", b"")

    with pytest.raises(TransientException):
        UploadImageUseCase(uow=FakeUow(), store=FakeImageStore(fail="save")).execute(
            USER_ID,
            "demo.jpg",
            b"bytes",
        )


def test_get_image_returns_download_or_typed_failures():
    image = make_image(filename="demo.jpg")

    dto = asyncio.run(
        GetImageUseCase(
            uow=FakeUow(images={image.id: image}),
            store=FakeImageStore(content=b"image-data"),
        ).execute(USER_ID, image.id)
    )

    assert dto.image_bytes == b"image-data"
    assert dto.filename == "demo.jpg"

    with pytest.raises(NotFoundException):
        asyncio.run(GetImageUseCase(FakeUow(), FakeImageStore()).execute(USER_ID, uuid4()))

    with pytest.raises(TransientException):
        asyncio.run(
            GetImageUseCase(
                FakeUow(images={image.id: image}),
                FakeImageStore(fail="missing"),
            ).execute(USER_ID, image.id)
        )


def test_reload_and_rollback_use_cases():
    loader = FakeLoader()
    swapper = FakeSwapper(previous=SimpleNamespace(version="previous"))

    loaded = ReloadModelUseCase(
        weights_repo=FakeWeightsRepo(),
        loader=loader,
        swapper=swapper,
        uow=FakeUow(),
    ).execute()

    assert loaded.version == "v1"
    assert swapper.swapped == loaded

    with pytest.raises(TransientException):
        ReloadModelUseCase(
            weights_repo=FakeWeightsRepo(fail="missing"),
            loader=loader,
            swapper=swapper,
            uow=FakeUow(),
        ).execute()

    assert RollbackModelUseCase(swapper).execute().version == "previous"

    with pytest.raises(NotFoundException):
        RollbackModelUseCase(FakeSwapper(previous=None)).execute()


def test_detect_use_case_attaches_image_id_and_persists_labels():
    image_id = uuid4()
    uow = FakeUow()
    detections = DetectUseCase(
        uow=uow,
        swapper=FakeSwapper(current=SimpleNamespace()),
        detector=FakeDetector(),
    ).execute(image_id=image_id, image_bytes=b"image")

    assert len(detections) == 1
    assert detections[0].class_name == "cat"
    assert uow.labels.added[0].image_id == image_id
    assert uow.commits == 1
