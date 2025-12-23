"""邀请令牌模型"""
from datetime import datetime
from typing import Optional
from enum import Enum
from pydantic import BaseModel, Field


class InviteStatus(str, Enum):
    PENDING = "PENDING"    # 待认领
    CLAIMED = "CLAIMED"    # 已认领
    EXPIRED = "EXPIRED"    # 已过期
    REVOKED = "REVOKED"    # 已撤销


class Invite(BaseModel):
    token: str
    status: InviteStatus = InviteStatus.PENDING
    tier: str = "Pro"
    entitlement_days: int = 90
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None
    claimed_at: Optional[datetime] = None
    claimed_email: Optional[str] = None
    claimed_user_id: Optional[str] = None
    note: Optional[str] = None
