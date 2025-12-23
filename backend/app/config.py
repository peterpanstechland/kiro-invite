"""应用配置"""
from pydantic_settings import BaseSettings
from typing import List, Optional
import json


class Settings(BaseSettings):
    # AWS (AWS_REGION is auto-set by Lambda, use AWS_DEFAULT_REGION for local)
    AWS_REGION: str = "us-east-1"
    AWS_DEFAULT_REGION: str = "us-east-1"
    IDENTITY_STORE_ID: str = ""
    IDENTITY_CENTER_INSTANCE_ARN: str = ""
    
    # DynamoDB
    DYNAMODB_TABLE_PREFIX: str = "kiro_invite"
    USE_DYNAMODB: bool = False  # True for Lambda, False for local SQLite
    
    # IDC Groups
    IDC_GROUP_PRO: str = ""
    IDC_GROUP_PRO_PLUS: str = ""
    IDC_GROUP_POWER: str = ""
    
    # App
    FRONTEND_URL: str = "http://localhost:3000"
    CORS_ORIGINS: str = '["http://localhost:3000"]'
    ADMIN_PASSWORD: str = ""  # Fallback password auth
    
    # Cognito
    COGNITO_USER_POOL_ID: str = ""
    COGNITO_CLIENT_ID: str = ""
    COGNITO_REGION: str = "us-east-1"
    
    @property
    def cors_origins_list(self) -> List[str]:
        return json.loads(self.CORS_ORIGINS)
    
    def get_group_id(self, tier: str) -> Optional[str]:
        """根据 Tier 获取对应的 Group ID"""
        mapping = {
            "Pro": self.IDC_GROUP_PRO,
            "Pro+": self.IDC_GROUP_PRO_PLUS,
            "Power": self.IDC_GROUP_POWER,
        }
        return mapping.get(tier)
    
    class Config:
        env_file = ".env"


settings = Settings()
