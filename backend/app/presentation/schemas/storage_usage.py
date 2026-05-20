from pydantic import BaseModel


class StorageUsageSchema(BaseModel):
    used_bytes: int
    quota_bytes: int
    remaining_bytes: int
    dataset_bytes: int
    model_bytes: int
