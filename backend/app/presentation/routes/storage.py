from fastapi import APIRouter, Depends
from fastapi_injector import Injected

from app.application.use_cases.get_storage_usage import GetStorageUsageUseCase
from app.domain.entities.user import User
from app.presentation.dependencies.auth import require_authenticated_user
from app.presentation.schemas.storage_usage import StorageUsageSchema

router = APIRouter(
    prefix="/api/storage",
    tags=["storage"],
)


@router.get("", response_model=StorageUsageSchema)
def get_storage_usage(
    current_user: User = Depends(require_authenticated_user),
    use_case: GetStorageUsageUseCase = Injected(GetStorageUsageUseCase),
):
    usage = use_case.execute(current_user.id)
    return StorageUsageSchema(
        used_bytes=usage.used_bytes,
        quota_bytes=usage.quota_bytes,
        remaining_bytes=usage.remaining_bytes,
        dataset_bytes=usage.dataset_bytes,
        model_bytes=usage.model_bytes,
    )
