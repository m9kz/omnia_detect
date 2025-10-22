from pydantic import BaseModel


class IdentityCreateRequest(BaseModel):
    name: str

