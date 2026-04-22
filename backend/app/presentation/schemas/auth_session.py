from pydantic import BaseModel

from app.presentation.schemas.user import UserSchema


class AuthSessionSchema(BaseModel):
    accessToken: str
    user: UserSchema
