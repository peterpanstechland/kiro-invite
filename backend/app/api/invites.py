"""邀请令牌 API"""
from fastapi import APIRouter, HTTPException, Header, Query, Depends
from typing import Optional, List
from datetime import datetime, timedelta
from pydantic import BaseModel, Field
import secrets
import uuid

from app.models.invite import InviteStatus
from app.models.user import UserStatus
from app.services.db_factory import db
from app.services.idc import IDCService
from app.services.auth import cognito_auth
from app.config import settings


router = APIRouter()


# ==================== 认证 ====================

def verify_admin(
    authorization: Optional[str] = Header(None)
):
    """
    验证管理员身份
    必须使用 Cognito JWT Token (Authorization: Bearer <token>)
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "需要登录认证")
    
    token = authorization[7:]
    payload = cognito_auth.verify_token(token)
    
    if payload:
        return {"type": "cognito", "email": payload.get("email")}
    
    raise HTTPException(401, "无效的认证令牌，请重新登录")


# ==================== 请求/响应模型 ====================

class CreateInvitesRequest(BaseModel):
    count: int = Field(..., ge=1, le=100, description="创建数量")
    tier: str = Field(default="Pro")
    entitlement_days: int = Field(default=90, description="账号有效天数")
    expires_date: Optional[str] = Field(default=None, description="到期日期 YYYY-MM-DD")
    note: Optional[str] = None
    identity_store_id: Optional[str] = None
    sso_url: Optional[str] = None


class InviteResponse(BaseModel):
    token: str
    status: str
    tier: str
    entitlement_days: int
    created_at: datetime
    expires_at: Optional[datetime]
    claimed_email: Optional[str]
    claim_url: str
    note: Optional[str]


class ClaimRequest(BaseModel):
    email: str
    display_name: Optional[str] = None


class ClaimResponse(BaseModel):
    success: bool
    error: Optional[str] = None
    username: Optional[str] = None
    email: Optional[str] = None
    tier: Optional[str] = None
    expires_at: Optional[datetime] = None
    sso_url: Optional[str] = None


class InviteInfoResponse(BaseModel):
    valid: bool
    error: Optional[str] = None
    tier: Optional[str] = None
    entitlement_days: Optional[int] = None
    expires_at: Optional[str] = None
    created_at: Optional[str] = None


# ==================== 管理员 API ====================

@router.post("/create", response_model=List[InviteResponse])
async def create_invites(
    req: CreateInvitesRequest,
    x_identity_store_id: Optional[str] = Header(None),
    _: bool = Depends(verify_admin)
):
    """批量创建邀请令牌"""
    store_id = req.identity_store_id or x_identity_store_id or settings.IDENTITY_STORE_ID
    sso_url = req.sso_url or f"https://{store_id}.awsapps.com/start"
    
    now = datetime.now()
    
    if req.expires_date:
        expires_at = datetime.strptime(req.expires_date, "%Y-%m-%d").replace(hour=23, minute=50, second=0)
    else:
        expires_at = now + timedelta(days=req.entitlement_days)
        expires_at = expires_at.replace(hour=23, minute=50, second=0)
    
    results = []
    
    for _ in range(req.count):
        token = secrets.token_urlsafe(12)
        
        db.insert_invite({
            "token": token,
            "status": "PENDING",
            "tier": req.tier,
            "entitlement_days": req.entitlement_days,
            "created_at": now.isoformat(),
            "expires_at": expires_at.isoformat(),
            "note": req.note,
            "identity_store_id": store_id,
            "sso_url": sso_url
        })
        
        results.append(InviteResponse(
            token=token,
            status="PENDING",
            tier=req.tier,
            entitlement_days=req.entitlement_days,
            created_at=now,
            expires_at=expires_at,
            claimed_email=None,
            claim_url=f"{settings.FRONTEND_URL}/claim/{token}",
            note=req.note
        ))
    
    return results


@router.get("/list", response_model=List[InviteResponse])
async def list_invites(
    status: Optional[str] = None,
    store_id: Optional[str] = Query(None),
    x_identity_store_id: Optional[str] = Header(None),
    _: bool = Depends(verify_admin)
):
    """列出所有邀请令牌"""
    identity_store_id = store_id or x_identity_store_id
    invites = db.get_invites(identity_store_id=identity_store_id, status=status)
    
    return [
        InviteResponse(
            token=inv["token"],
            status=inv["status"],
            tier=inv["tier"],
            entitlement_days=inv["entitlement_days"],
            created_at=datetime.fromisoformat(inv["created_at"]) if inv["created_at"] else datetime.now(),
            expires_at=datetime.fromisoformat(inv["expires_at"]) if inv.get("expires_at") else None,
            claimed_email=inv.get("claimed_email"),
            claim_url=f"{settings.FRONTEND_URL}/claim/{inv['token']}",
            note=inv.get("note")
        )
        for inv in invites
    ]


@router.delete("/{token}")
async def revoke_invite(token: str, _: bool = Depends(verify_admin)):
    """撤销邀请令牌"""
    invite = db.get_invite(token)
    if not invite:
        raise HTTPException(404, "令牌不存在")
    if invite["status"] == "CLAIMED":
        raise HTTPException(400, "已被认领，无法撤销")
    
    db.update_invite(token, {"status": "REVOKED"})
    return {"success": True}


# ==================== 公开 API（学生使用）====================

@router.get("/info/{token}", response_model=InviteInfoResponse)
async def get_invite_info(token: str):
    """获取邀请信息"""
    invite = db.get_invite(token)
    
    if not invite:
        return InviteInfoResponse(valid=False, error="无效的邀请链接")
    
    if invite["status"] == "CLAIMED":
        return InviteInfoResponse(valid=False, error="该邀请已被使用")
    
    if invite["status"] == "REVOKED":
        return InviteInfoResponse(valid=False, error="该邀请已被撤销")
    
    if invite.get("expires_at"):
        exp = datetime.fromisoformat(invite["expires_at"])
        if exp < datetime.utcnow():
            return InviteInfoResponse(valid=False, error="该邀请已过期")
    
    return InviteInfoResponse(
        valid=True,
        tier=invite["tier"],
        entitlement_days=invite["entitlement_days"],
        expires_at=invite.get("expires_at"),
        created_at=invite.get("created_at")
    )


@router.post("/claim/{token}", response_model=ClaimResponse)
async def claim_invite(token: str, req: ClaimRequest):
    """认领邀请（学生填写邮箱）"""
    invite = db.get_invite(token)
    
    if not invite:
        return ClaimResponse(success=False, error="无效的邀请链接")
    
    if invite["status"] != "PENDING":
        return ClaimResponse(success=False, error="该邀请不可用")
    
    if invite.get("expires_at"):
        exp = datetime.fromisoformat(invite["expires_at"])
        if exp < datetime.utcnow():
            return ClaimResponse(success=False, error="该邀请已过期")
    
    store_id = invite.get("identity_store_id") or settings.IDENTITY_STORE_ID
    sso_url = invite.get("sso_url") or f"https://{store_id}.awsapps.com/start"
    
    if db.get_user_by_email(req.email, store_id):
        return ClaimResponse(success=False, error="该邮箱已注册")
    
    email_prefix = req.email.split('@')[0]
    username = f"kiro_{email_prefix[:20]}"
    
    if db.get_user_by_username(username, store_id):
        username = f"kiro_{email_prefix[:12]}_{uuid.uuid4().hex[:4]}"
    
    idc_service = IDCService(identity_store_id=store_id)
    
    idc_user_id = idc_service.create_user(
        username=username,
        email=req.email,
        display_name=req.display_name or email_prefix
    )
    
    if not idc_user_id:
        return ClaimResponse(success=False, error="创建 AWS 账号失败，请稍后重试")
    
    tier = invite["tier"]
    group_id = settings.get_group_id(tier)
    if group_id:
        idc_service.add_user_to_group(idc_user_id, group_id)
    
    now = datetime.utcnow()
    # 使用邀请的过期时间
    if invite.get("expires_at"):
        expires_at = datetime.fromisoformat(invite["expires_at"])
    else:
        expires_at = now + timedelta(days=int(invite["entitlement_days"]))
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    
    db.insert_user({
        "user_id": user_id,
        "username": username,
        "email": req.email,
        "display_name": req.display_name or email_prefix,
        "status": "ACTIVE",
        "tier": tier,
        "idc_user_id": idc_user_id,
        "created_at": now.isoformat(),
        "expires_at": expires_at.isoformat(),
        "invite_token": token,
        "identity_store_id": store_id,
        "sso_url": sso_url
    })
    
    db.update_invite(token, {
        "status": "CLAIMED",
        "claimed_at": now.isoformat(),
        "claimed_email": req.email,
        "claimed_user_id": user_id
    })
    
    return ClaimResponse(
        success=True,
        username=username,
        email=req.email,
        tier=tier,
        expires_at=expires_at,
        sso_url=sso_url
    )
