"""用户管理 API"""
from fastapi import APIRouter, HTTPException, Header, Query, Depends
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

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


class UserResponse(BaseModel):
    user_id: str
    username: str
    email: str
    display_name: Optional[str]
    status: str
    tier: str
    created_at: datetime
    expires_at: Optional[datetime]


@router.get("/list", response_model=List[UserResponse])
async def list_users(
    store_id: Optional[str] = Query(None),
    x_identity_store_id: Optional[str] = Header(None),
    _: bool = Depends(verify_admin)
):
    """列出所有用户"""
    identity_store_id = store_id or x_identity_store_id
    users = db.get_users(identity_store_id=identity_store_id)
    
    return [
        UserResponse(
            user_id=u["user_id"],
            username=u["username"],
            email=u["email"],
            display_name=u.get("display_name"),
            status=u["status"],
            tier=u["tier"],
            created_at=datetime.fromisoformat(u["created_at"]) if u["created_at"] else datetime.now(),
            expires_at=datetime.fromisoformat(u["expires_at"]) if u.get("expires_at") else None
        )
        for u in users
    ]


@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    store_id: Optional[str] = Query(None),
    x_identity_store_id: Optional[str] = Header(None),
    _: bool = Depends(verify_admin)
):
    """删除用户"""
    user = db.get_user(user_id)
    if not user:
        raise HTTPException(404, "用户不存在")
    
    # 获取租户 ID
    identity_store_id = user.get("identity_store_id") or store_id or x_identity_store_id or settings.IDENTITY_STORE_ID
    
    # 从 IDC 删除
    if user.get("idc_user_id"):
        idc_service = IDCService(identity_store_id=identity_store_id)
        idc_service.delete_user(user["idc_user_id"])
    
    # 从数据库删除
    db.delete_user(user_id)
    
    return {"success": True}


@router.post("/{user_id}/disable")
async def disable_user(user_id: str, _: bool = Depends(verify_admin)):
    """禁用用户"""
    user = db.get_user(user_id)
    if not user:
        raise HTTPException(404, "用户不存在")
    
    identity_store_id = user.get("identity_store_id") or settings.IDENTITY_STORE_ID
    if user.get("idc_user_id"):
        idc_service = IDCService(identity_store_id=identity_store_id)
        idc_service.disable_user(user["idc_user_id"])
    
    db.update_user(user_id, {"status": "DISABLED"})
    return {"success": True}


@router.post("/{user_id}/enable")
async def enable_user(user_id: str, _: bool = Depends(verify_admin)):
    """启用用户"""
    user = db.get_user(user_id)
    if not user:
        raise HTTPException(404, "用户不存在")
    
    identity_store_id = user.get("identity_store_id") or settings.IDENTITY_STORE_ID
    if user.get("idc_user_id"):
        idc_service = IDCService(identity_store_id=identity_store_id)
        idc_service.enable_user(user["idc_user_id"])
    
    db.update_user(user_id, {"status": "ACTIVE"})
    return {"success": True}
