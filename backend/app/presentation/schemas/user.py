from pydantic import BaseModel


class UserSchema(BaseModel):
    id: str
    login: str
    name: str | None = None
