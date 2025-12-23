"""用户模型"""
from datetime import datetime
from typing import Optional
from enum import Enum
from pydantic import BaseModel, Field


class UserStatus(str, Enum):
    ACTIVE = "ACTIVE"
    EXPIRED = "EXPIRED"
    DISABLED = "DISABLED"


class User(BaseModel):
    user_id: str
    username: str
    email: str
    display_name: Optional[str] = None
    status: UserStatus = UserStatus.ACTIVE
    tier: str = "Pro"
    idc_user_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None
    invite_token: Optional[str] = None
