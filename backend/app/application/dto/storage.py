from dataclasses import dataclass


@dataclass(frozen=True)
class StorageUsageDTO:
    used_bytes: int
    quota_bytes: int
    remaining_bytes: int
    dataset_bytes: int
    model_bytes: int
