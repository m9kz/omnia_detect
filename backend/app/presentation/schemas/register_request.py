from pydantic import BaseModel, Field


class RegisterRequestSchema(BaseModel):
    login: str = Field(min_length=3, max_length=64)
    password: str = Field(min_length=8, max_length=256)
    name: str | None = Field(default=None, max_length=120)
