"""DynamoDB 数据库服务"""
import boto3
from typing import Dict, List, Optional
from datetime import datetime
from app.config import settings


class DynamoDB:
    """DynamoDB 数据库管理"""
    
    def __init__(self):
        self._client = None
        self._resource = None
        self.table_prefix = settings.DYNAMODB_TABLE_PREFIX or "kiro_invite"
    
    @property
    def client(self):
        if self._client is None:
            self._client = boto3.client('dynamodb', region_name=settings.AWS_REGION)
        return self._client
    
    @property
    def resource(self):
        if self._resource is None:
            self._resource = boto3.resource('dynamodb', region_name=settings.AWS_REGION)
        return self._resource
    
    @property
    def invites_table(self):
        return self.resource.Table(f"{self.table_prefix}_invites")
    
    @property
    def users_table(self):
        return self.resource.Table(f"{self.table_prefix}_users")
    
    def init_tables(self):
        """创建 DynamoDB 表（首次部署时运行）"""
        existing = [t.name for t in self.resource.tables.all()]
        
        # 邀请表
        invites_table = f"{self.table_prefix}_invites"
        if invites_table not in existing:
            self.client.create_table(
                TableName=invites_table,
                KeySchema=[{'AttributeName': 'token', 'KeyType': 'HASH'}],
                AttributeDefinitions=[{'AttributeName': 'token', 'AttributeType': 'S'}],
                BillingMode='PAY_PER_REQUEST'
            )
            print(f"创建表: {invites_table}")
        
        # 用户表
        users_table = f"{self.table_prefix}_users"
        if users_table not in existing:
            self.client.create_table(
                TableName=users_table,
                KeySchema=[{'AttributeName': 'user_id', 'KeyType': 'HASH'}],
                AttributeDefinitions=[{'AttributeName': 'user_id', 'AttributeType': 'S'}],
                BillingMode='PAY_PER_REQUEST'
            )
            print(f"创建表: {users_table}")
    
    # ==================== 邀请操作 ====================
    
    def insert_invite(self, invite: Dict) -> bool:
        try:
            self.invites_table.put_item(Item=invite)
            return True
        except Exception as e:
            print(f"插入邀请失败: {e}")
            return False
    
    def get_invite(self, token: str) -> Optional[Dict]:
        try:
            response = self.invites_table.get_item(Key={'token': token})
            return response.get('Item')
        except Exception:
            return None
    
    def get_invites(self, identity_store_id: Optional[str] = None, status: Optional[str] = None) -> List[Dict]:
        try:
            response = self.invites_table.scan()
            items = response.get('Items', [])
            
            if identity_store_id:
                items = [i for i in items if i.get('identity_store_id') == identity_store_id]
            if status:
                items = [i for i in items if i.get('status') == status]
            
            return sorted(items, key=lambda x: x.get('created_at', ''), reverse=True)
        except Exception as e:
            print(f"获取邀请列表失败: {e}")
            return []
    
    def update_invite(self, token: str, updates: Dict) -> bool:
        try:
            update_expr = 'SET ' + ', '.join([f'#{k} = :{k}' for k in updates.keys()])
            expr_names = {f'#{k}': k for k in updates.keys()}
            expr_values = {f':{k}': v for k, v in updates.items()}
            
            self.invites_table.update_item(
                Key={'token': token},
                UpdateExpression=update_expr,
                ExpressionAttributeNames=expr_names,
                ExpressionAttributeValues=expr_values
            )
            return True
        except Exception as e:
            print(f"更新邀请失败: {e}")
            return False
    
    # ==================== 用户操作 ====================
    
    def insert_user(self, user: Dict) -> bool:
        try:
            self.users_table.put_item(Item=user)
            return True
        except Exception as e:
            print(f"插入用户失败: {e}")
            return False
    
    def get_user(self, user_id: str) -> Optional[Dict]:
        try:
            response = self.users_table.get_item(Key={'user_id': user_id})
            return response.get('Item')
        except Exception:
            return None
    
    def get_user_by_email(self, email: str, identity_store_id: Optional[str] = None) -> Optional[Dict]:
        try:
            response = self.users_table.scan(
                FilterExpression='email = :email',
                ExpressionAttributeValues={':email': email}
            )
            items = response.get('Items', [])
            if identity_store_id:
                items = [i for i in items if i.get('identity_store_id') == identity_store_id]
            return items[0] if items else None
        except Exception:
            return None
    
    def get_user_by_username(self, username: str, identity_store_id: Optional[str] = None) -> Optional[Dict]:
        try:
            response = self.users_table.scan(
                FilterExpression='username = :username',
                ExpressionAttributeValues={':username': username}
            )
            items = response.get('Items', [])
            if identity_store_id:
                items = [i for i in items if i.get('identity_store_id') == identity_store_id]
            return items[0] if items else None
        except Exception:
            return None
    
    def get_users(self, identity_store_id: Optional[str] = None, status: Optional[str] = None) -> List[Dict]:
        try:
            response = self.users_table.scan()
            items = response.get('Items', [])
            
            if identity_store_id:
                items = [i for i in items if i.get('identity_store_id') == identity_store_id]
            if status:
                items = [i for i in items if i.get('status') == status]
            
            return sorted(items, key=lambda x: x.get('created_at', ''), reverse=True)
        except Exception as e:
            print(f"获取用户列表失败: {e}")
            return []
    
    def update_user(self, user_id: str, updates: Dict) -> bool:
        try:
            update_expr = 'SET ' + ', '.join([f'#{k} = :{k}' for k in updates.keys()])
            expr_names = {f'#{k}': k for k in updates.keys()}
            expr_values = {f':{k}': v for k, v in updates.items()}
            
            self.users_table.update_item(
                Key={'user_id': user_id},
                UpdateExpression=update_expr,
                ExpressionAttributeNames=expr_names,
                ExpressionAttributeValues=expr_values
            )
            return True
        except Exception as e:
            print(f"更新用户失败: {e}")
            return False
    
    def delete_user(self, user_id: str) -> bool:
        try:
            self.users_table.delete_item(Key={'user_id': user_id})
            return True
        except Exception as e:
            print(f"删除用户失败: {e}")
            return False


# 单例
db = DynamoDB()
