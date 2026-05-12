from pydantic import BaseModel, Field


class ResourceNameUpdateSchema(BaseModel):
    name: str = Field(min_length=1, max_length=80)
