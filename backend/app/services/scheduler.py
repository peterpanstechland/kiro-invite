"""定时任务：检查并处理过期账号"""
from datetime import datetime
from typing import Literal
from app.services.db_factory import db
from app.services.idc import IDCService
from app.config import settings


class AccountScheduler:
    """账号过期管理"""
    
    def __init__(self, action: Literal["disable", "delete"] = "disable"):
        """
        action: 过期后的处理方式
        - disable: 禁用账号（可恢复）
        - delete: 删除账号（不可恢复）
        """
        self.action = action
    
    def check_expired_accounts(self) -> dict:
        """
        检查并处理过期账号
        返回处理结果统计
        """
        now = datetime.now()
        users = db.get_users(status="ACTIVE")
        
        results = {
            "checked": len(users),
            "expired": 0,
            "processed": 0,
            "failed": 0,
            "details": []
        }
        
        for user in users:
            if user.get("status") != "ACTIVE":
                continue
                
            expires_at = user.get("expires_at")
            if not expires_at:
                continue
            
            # 解析过期时间
            try:
                expire_time = datetime.fromisoformat(expires_at)
                # 到期当天 23:50 删除，所以判断时间设为当天 23:50
                expire_time = expire_time.replace(hour=23, minute=50, second=0)
            except:
                continue
            
            # 检查是否过期
            if now >= expire_time:
                results["expired"] += 1
                success = self._process_expired_user(user)
                
                if success:
                    results["processed"] += 1
                    results["details"].append({
                        "username": user["username"],
                        "action": self.action,
                        "status": "success"
                    })
                else:
                    results["failed"] += 1
                    results["details"].append({
                        "username": user["username"],
                        "action": self.action,
                        "status": "failed"
                    })
        
        return results
    
    def _process_expired_user(self, user: dict) -> bool:
        """处理单个过期用户"""
        idc_user_id = user.get("idc_user_id")
        username = user.get("username")
        identity_store_id = user.get("identity_store_id") or settings.IDENTITY_STORE_ID
        
        if not idc_user_id:
            return False
        
        idc_service = IDCService(identity_store_id=identity_store_id)
        
        try:
            if self.action == "delete":
                # 删除 IDC 用户
                success = idc_service.delete_user(idc_user_id)
                if success:
                    db.update_user(user["user_id"], {
                        "status": "DELETED",
                        "deleted_at": datetime.now().isoformat()
                    })
                    print(f"已删除过期用户: {username}")
                return success
            else:
                # 禁用 IDC 用户
                success = idc_service.disable_user(idc_user_id)
                if success:
                    db.update_user(user["user_id"], {
                        "status": "EXPIRED",
                        "expired_at": datetime.now().isoformat()
                    })
                    print(f"已禁用过期用户: {username}")
                return success
        except Exception as e:
            print(f"处理过期用户失败 {username}: {e}")
            return False
    
    def get_expiring_soon(self, days: int = 7) -> list:
        """获取即将过期的账号（提前提醒用）"""
        from datetime import timedelta
        now = datetime.now()
        threshold = now + timedelta(days=days)
        
        users = db.get_users(status="ACTIVE")
        expiring = []
        
        for user in users:
            expires_at = user.get("expires_at")
            if not expires_at:
                continue
            
            try:
                expire_time = datetime.fromisoformat(expires_at)
                if now < expire_time <= threshold:
                    user["days_left"] = (expire_time - now).days
                    expiring.append(user)
            except:
                continue
        
        return sorted(expiring, key=lambda x: x.get("days_left", 0))


# 使用删除模式 - 过期后自动删除 IDC 账号
scheduler = AccountScheduler(action="delete")
