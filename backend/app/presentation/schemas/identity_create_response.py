from typing import Optional
from pydantic import BaseModel


class IdentityCreateResponse(BaseModel):
    identity_name: str
    added_refs: int