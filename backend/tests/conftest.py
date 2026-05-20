from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from app.domain.entities.dataset_artifact import DatasetArtifact
from app.domain.entities.image_item import ImageItem
from app.domain.entities.model_artifact import ModelArtifact
from app.domain.entities.user import User


class DatasetRepo:
    def __init__(self, items=None):
        self.items = dict(items or {})
        self.added = None
        self.updated = None
        self.deleted = None

    def add(self, dataset):
        self.items[dataset.id] = dataset
        self.added = dataset

    def get(self, dataset_id):
        return self.items.get(dataset_id)

    def get_for_user(self, dataset_id, user_id):
        dataset = self.items.get(dataset_id)
        return dataset if dataset and dataset.user_id == user_id else None

    def update(self, dataset):
        self.items[dataset.id] = dataset
        self.updated = dataset

    def delete(self, dataset_id):
        self.deleted = self.items.pop(dataset_id, None)
        return self.deleted

    def delete_for_user(self, dataset_id, user_id):
        dataset = self.get_for_user(dataset_id, user_id)
        if not dataset:
            return None

        self.deleted = self.items.pop(dataset_id, None)
        return self.deleted

    def list(self, limit=50):
        return list(self.items.values())[:limit]

    def list_for_user(self, user_id, limit=50):
        return [item for item in self.items.values() if item.user_id == user_id][:limit]

    def sum_size_for_user(self, user_id):
        return sum(item.size_bytes for item in self.items.values() if item.user_id == user_id)


class ModelRepo:
    def __init__(self, items=None):
        self.items = dict(items or {})
        self.added = None
        self.updated = None

    def add(self, model):
        self.items[model.id] = model
        self.added = model

    def get(self, model_id):
        return self.items.get(model_id)

    def get_for_user(self, model_id, user_id):
        model = self.items.get(model_id)
        return model if model and model.user_id == user_id else None

    def update(self, model):
        self.items[model.id] = model
        self.updated = model

    def delete(self, model_id):
        return self.items.pop(model_id, None)

    def delete_for_user(self, model_id, user_id):
        model = self.get_for_user(model_id, user_id)
        if not model:
            return None

        return self.items.pop(model_id, None)

    def list(self, limit=50):
        return list(self.items.values())[:limit]

    def list_for_user(self, user_id, limit=50):
        return [item for item in self.items.values() if item.user_id == user_id][:limit]

    def list_for_dataset(self, dataset_id):
        return [model for model in self.items.values() if model.dataset_id == dataset_id]

    def list_for_dataset_for_user(self, dataset_id, user_id):
        return [
            model
            for model in self.items.values()
            if model.dataset_id == dataset_id and model.user_id == user_id
        ]

    def sum_size_for_user(self, user_id):
        return sum(item.size_bytes for item in self.items.values() if item.user_id == user_id)


class ImageRepo:
    def __init__(self, items=None):
        self.items = dict(items or {})
        self.added = None

    def add(self, image):
        self.items[image.id] = image
        self.added = image

    def get(self, image_id):
        return self.items.get(image_id)

    def get_for_user(self, image_id, user_id):
        image = self.items.get(image_id)
        return image if image and image.user_id == user_id else None

    def list(self, query=None, limit=20):
        values = list(self.items.values())
        if query:
            values = [image for image in values if query in image.filename]
        return values[:limit]

    def list_for_user(self, user_id, query=None, limit=20):
        values = [image for image in self.items.values() if image.user_id == user_id]
        if query:
            values = [image for image in values if query in image.filename]
        return values[:limit]


class LabelRepo:
    def __init__(self):
        self.added = []

    def add_many(self, labels):
        self.added.extend(labels)

    def list_for_image(self, image_id):
        return [label for label in self.added if label.image_id == image_id]


class JobRepo:
    def __init__(self, items=None):
        self.items = dict(items or {})
        self.added = None
        self.updated = None

    def add(self, job):
        self.items[job.id] = job
        self.added = job

    def get(self, job_id):
        return self.items.get(job_id)

    def get_for_user(self, job_id, user_id):
        job = self.items.get(job_id)
        return job if job and job.user_id == user_id else None

    def update(self, job):
        self.items[job.id] = job
        self.updated = job

    def list(self, limit=50):
        return list(self.items.values())[:limit]

    def list_for_user(self, user_id, limit=50):
        return [item for item in self.items.values() if item.user_id == user_id][:limit]

    def list_pending(self, limit=100):
        return [
            job for job in self.items.values() if job.status in {"queued", "running"}
        ][:limit]

    def list_pending_for_dataset(self, dataset_id):
        return [
            job
            for job in self.items.values()
            if job.dataset_id == dataset_id and job.status in {"queued", "running"}
        ]

    def list_pending_for_dataset_for_user(self, dataset_id, user_id):
        return [
            job
            for job in self.items.values()
            if job.dataset_id == dataset_id
            and job.user_id == user_id
            and job.status in {"queued", "running"}
        ]

    def list_pending_for_base_model(self, model_id):
        return [
            job
            for job in self.items.values()
            if job.base_model_id == model_id and job.status in {"queued", "running"}
        ]

    def list_pending_for_base_model_for_user(self, model_id, user_id):
        return [
            job
            for job in self.items.values()
            if job.base_model_id == model_id
            and job.user_id == user_id
            and job.status in {"queued", "running"}
        ]


class UserRepo:
    def __init__(self, items=None):
        self.items = dict(items or {})
        self.added = None

    def add(self, user):
        self.items[user.id] = user
        self.added = user

    def get(self, user_id):
        return self.items.get(user_id)

    def get_by_login(self, login):
        for user in self.items.values():
            if user.login == login:
                return user
        return None


class FakeUow:
    def __init__(self, *, datasets=None, models=None, images=None, jobs=None, users=None):
        self.datasets = DatasetRepo(datasets)
        self.models = ModelRepo(models)
        self.images = ImageRepo(images)
        self.labels = LabelRepo()
        self.jobs = JobRepo(jobs)
        self.users = UserRepo(users)
        self.commits = 0

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def commit(self):
        self.commits += 1


def make_dataset(**overrides):
    dataset_id = overrides.pop("id", uuid4())
    return DatasetArtifact(
        id=dataset_id,
        user_id=overrides.pop("user_id", "user-1"),
        name=overrides.pop("name", "Dataset"),
        class_names=overrides.pop("class_names", ["cat"]),
        ratio=overrides.pop("ratio", 0.5),
        num_pairs=overrides.pop("num_pairs", 2),
        train_count=overrides.pop("train_count", 1),
        val_count=overrides.pop("val_count", 1),
        zip_relpath=overrides.pop("zip_relpath", "data/datasets/test/dataset.zip"),
        size_bytes=overrides.pop("size_bytes", 1024),
        created_at=overrides.pop("created_at", datetime.now(timezone.utc)),
    )


def make_model(**overrides):
    model_id = overrides.pop("id", uuid4())
    return ModelArtifact(
        id=model_id,
        user_id=overrides.pop("user_id", "user-1"),
        name=overrides.pop("name", "Model"),
        dataset_id=overrides.pop("dataset_id", uuid4()),
        base_weights=overrides.pop("base_weights", "base.pt"),
        best_weights_path=overrides.pop("best_weights_path", "best.pt"),
        epochs=overrides.pop("epochs", 5),
        imgsz=overrides.pop("imgsz", 640),
        metrics_path=overrides.pop("metrics_path", None),
        size_bytes=overrides.pop("size_bytes", 2048),
        created_at=overrides.pop("created_at", datetime.now(timezone.utc)),
    )


def make_image(**overrides):
    image_id = overrides.pop("id", uuid4())
    return ImageItem(
        id=image_id,
        user_id=overrides.pop("user_id", "user-1"),
        url=overrides.pop("url", f"http://test/images/{image_id}/content"),
        width=overrides.pop("width", 100),
        height=overrides.pop("height", 80),
        filename=overrides.pop("filename", "image.jpg"),
        uploaded_at=overrides.pop("uploaded_at", datetime.now(timezone.utc)),
    )


def make_user(**overrides):
    return User(
        id=overrides.pop("id", "user-1"),
        login=overrides.pop("login", "login"),
        name=overrides.pop("name", "User"),
        password_hash=overrides.pop("password_hash", "hash"),
    )
