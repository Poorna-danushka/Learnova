from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator, model_validator


class NoteCreate(BaseModel):
    module_id: int = Field(gt=0)
    title: str = Field(min_length=1, max_length=160)
    content: str = Field(min_length=1, max_length=100000)

    @field_validator("title", "content")
    @classmethod
    def not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Field must not be blank.")
        return value.strip()


class NoteUpdate(BaseModel):
    module_id: Optional[int] = Field(default=None, gt=0)
    title: Optional[str] = Field(default=None, min_length=1, max_length=160)
    content: Optional[str] = Field(default=None, min_length=1, max_length=100000)

    @field_validator("title", "content")
    @classmethod
    def not_blank_if_present(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and not value.strip():
            raise ValueError("Field must not be blank.")
        return value.strip() if value is not None else value


class NoteResponse(NoteCreate):
    id: int
    owner_id: int
    module_id: int
    title: str
    content: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

