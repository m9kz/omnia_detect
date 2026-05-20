from app.application.dto.storage import StorageUsageDTO
from app.application.ports.uow import UnitOfWork
from app.domain.value_objects.storage_quota import StorageQuotaSnapshot


class GetStorageUsageUseCase:
    def __init__(self, uow: UnitOfWork, quota_bytes: int):
        self.uow = uow
        self.quota_bytes = quota_bytes

    def execute(self, user_id: str) -> StorageUsageDTO:
        with self.uow as u:
            dataset_bytes = u.datasets.sum_size_for_user(user_id)
            model_bytes = u.models.sum_size_for_user(user_id)

        snapshot = StorageQuotaSnapshot(
            used_bytes=dataset_bytes + model_bytes,
            quota_bytes=self.quota_bytes,
        )

        return StorageUsageDTO(
            used_bytes=snapshot.used_bytes,
            quota_bytes=snapshot.quota_bytes,
            remaining_bytes=snapshot.remaining_bytes,
            dataset_bytes=dataset_bytes,
            model_bytes=model_bytes,
        )
