from dataclasses import dataclass
from app.domain.value_objects.model_version import ModelVersion


@dataclass
class ModelHandle:
    """Pure domain representation; no framework types here."""
    version: ModelVersion
