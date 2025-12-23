"""数据库工厂 - 根据环境选择 SQLite 或 DynamoDB"""
from app.config import settings

if settings.USE_DYNAMODB:
    from app.services.dynamodb import db
else:
    from app.services.database import db

__all__ = ['db']
