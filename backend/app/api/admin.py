"""管理员 API"""
from fastapi import APIRouter, HTTPException
from app.services.scheduler import scheduler
from app.services.db_factory import db
from app.config import settings

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/auth-config")
async def get_auth_config():
    """获取认证配置（供前端使用）"""
    # 构建 Cognito domain
    cognito_domain = ""
    if settings.COGNITO_USER_POOL_ID:
        # 从 User Pool ID 提取 region (格式: us-east-1_xxxxx)
        region = settings.COGNITO_REGION or settings.AWS_REGION
        # 使用账号ID构建domain
        cognito_domain = f"https://kiro-invite-242201290799.auth.{region}.amazoncognito.com"
    
    return {
        "cognito": {
            "enabled": bool(settings.COGNITO_USER_POOL_ID and settings.COGNITO_CLIENT_ID),
            "userPoolId": settings.COGNITO_USER_POOL_ID,
            "clientId": settings.COGNITO_CLIENT_ID,
            "region": settings.COGNITO_REGION or settings.AWS_REGION,
            "domain": cognito_domain
        }
    }


@router.post("/cleanup")
async def cleanup_expired():
    """手动触发过期账号清理"""
    results = scheduler.check_expired_accounts()
    return results


@router.get("/expiring")
async def get_expiring_accounts(days: int = 7):
    """获取即将过期的账号"""
    accounts = scheduler.get_expiring_soon(days)
    return {
        "count": len(accounts),
        "days_threshold": days,
        "accounts": accounts
    }


@router.get("/stats")
async def get_stats():
    """获取账号统计"""
    all_users = db.get_users()
    active = db.get_users(status="ACTIVE")
    expired = db.get_users(status="EXPIRED")
    deleted = db.get_users(status="DELETED")
    
    return {
        "total": len(all_users),
        "active": len(active),
        "expired": len(expired),
        "deleted": len(deleted)
    }
