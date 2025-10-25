from threading import Lock
from typing import Optional

from app.application.ports.swapper import IModelSwapper
from app.domain.entities.model_handle import ModelHandle


class InMemoryModelSwapper(IModelSwapper):
    def __init__(self):
        self._current: Optional[ModelHandle] = None
        self._previous: Optional[ModelHandle] = None
        self._lock = Lock()

    def init(self, handle: ModelHandle):
        self._current = handle

    def get_current(self) -> ModelHandle:
        if not self._current:
            raise RuntimeError("Model not initialized")
        return self._current

    def swap(self, new_model: ModelHandle) -> None:
        with self._lock:
            self._previous, self._current = self._current, new_model

    def rollback(self) -> Optional[ModelHandle]:
        with self._lock:
            if not self._previous:
                return None
            self._previous, self._current = self._current, self._previous
            return self._current
