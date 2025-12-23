"""Cognito JWT 认证服务"""
import json
import time
import urllib.request
from typing import Optional, Dict
from jose import jwt, JWTError
from functools import lru_cache

from app.config import settings


class CognitoAuth:
    """Cognito JWT Token 验证"""
    
    def __init__(self):
        self.region = settings.COGNITO_REGION or settings.AWS_REGION
        self.user_pool_id = settings.COGNITO_USER_POOL_ID
        self.client_id = settings.COGNITO_CLIENT_ID
        self._jwks = None
        self._jwks_url = f"https://cognito-idp.{self.region}.amazonaws.com/{self.user_pool_id}/.well-known/jwks.json"
    
    @property
    def jwks(self) -> Dict:
        """获取 JWKS（带缓存）"""
        if self._jwks is None:
            self._jwks = self._fetch_jwks()
        return self._jwks
    
    def _fetch_jwks(self) -> Dict:
        """从 Cognito 获取 JWKS"""
        try:
            with urllib.request.urlopen(self._jwks_url, timeout=5) as response:
                return json.loads(response.read().decode())
        except Exception as e:
            print(f"获取 JWKS 失败: {e}")
            return {"keys": []}
    
    def verify_token(self, token: str) -> Optional[Dict]:
        """
        验证 Cognito JWT Token
        
        Returns:
            验证成功返回 token payload，失败返回 None
        """
        if not self.user_pool_id or not self.client_id:
            return None
        
        try:
            # 获取 token header 中的 kid
            unverified_header = jwt.get_unverified_header(token)
            kid = unverified_header.get("kid")
            
            # 从 JWKS 中找到对应的 key
            key = None
            for k in self.jwks.get("keys", []):
                if k.get("kid") == kid:
                    key = k
                    break
            
            if not key:
                print("找不到匹配的 JWK key")
                return None
            
            # 验证 token
            issuer = f"https://cognito-idp.{self.region}.amazonaws.com/{self.user_pool_id}"
            payload = jwt.decode(
                token,
                key,
                algorithms=["RS256"],
                audience=self.client_id,
                issuer=issuer,
                options={"verify_at_hash": False}
            )
            
            # 检查 token 类型
            token_use = payload.get("token_use")
            if token_use not in ["id", "access"]:
                print(f"无效的 token_use: {token_use}")
                return None
            
            # 检查过期
            exp = payload.get("exp", 0)
            if exp < time.time():
                print("Token 已过期")
                return None
            
            return payload
            
        except JWTError as e:
            print(f"JWT 验证失败: {e}")
            return None
        except Exception as e:
            print(f"Token 验证异常: {e}")
            return None
    
    def get_user_email(self, token: str) -> Optional[str]:
        """从 token 中获取用户邮箱"""
        payload = self.verify_token(token)
        if payload:
            return payload.get("email")
        return None


# 单例
cognito_auth = CognitoAuth()
