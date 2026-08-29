from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class PublicUserOut(BaseModel):
    id: int
    username: str
    is_following: bool

class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=30, pattern=r"^[A-Za-z0-9_]+$")
    email: EmailStr
    password: str = Field(min_length=8)


class UserOut(BaseModel):
    id: int
    username: str
    email: EmailStr
    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class PostCreate(BaseModel):
    body: str = Field(min_length=1, max_length=5000)


class PostUpdate(PostCreate):
    pass


class PostOut(BaseModel):
    id: int
    body: str
    author_id: int
    author_username: str
    like_count: int
    comment_count: int
    created_at: datetime
    updated_at: datetime


class CommentCreate(BaseModel):
    body: str = Field(min_length=1, max_length=2000)


class CommentOut(BaseModel):
    id: int
    body: str
    user_id: int
    username: str
    post_id: int
    created_at: datetime

class NotificationOut(BaseModel):
    id: int
    kind: str
    read: bool
    actor_id: int
    actor_username: str
    post_id: int
    created_at: datetime
