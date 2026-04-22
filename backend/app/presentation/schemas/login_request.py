from pydantic import BaseModel


class LoginRequestSchema(BaseModel):
    login: str
    password: str
