"""AWS IAM Identity Center 服务"""
import boto3
from typing import Optional
from app.config import settings


class IDCService:
    """AWS Identity Center 用户管理"""
    
    def __init__(self, identity_store_id: Optional[str] = None):
        self._client = None
        self.store_id = identity_store_id or settings.IDENTITY_STORE_ID
    
    @property
    def client(self):
        """延迟初始化 boto3 client"""
        if self._client is None:
            self._client = boto3.client(
                'identitystore',
                region_name=settings.AWS_REGION
            )
        return self._client
    
    def create_user(
        self,
        username: str,
        email: str,
        display_name: Optional[str] = None
    ) -> Optional[str]:
        """
        在 Identity Center 创建用户
        返回 IDC User ID
        """
        try:
            # AWS Identity Store 要求 Name 字段
            name = display_name or username
            response = self.client.create_user(
                IdentityStoreId=self.store_id,
                UserName=username,
                DisplayName=name,
                Name={
                    'GivenName': name,
                    'FamilyName': 'Kiro'
                },
                Emails=[{
                    'Value': email,
                    'Type': 'work',
                    'Primary': True
                }]
            )
            user_id = response['UserId']
            
            # 启用用户（API 创建的用户默认是 Disabled）
            try:
                self.client.update_user(
                    IdentityStoreId=self.store_id,
                    UserId=user_id,
                    Operations=[{
                        'AttributePath': 'active',
                        'AttributeValue': 'true'
                    }]
                )
            except Exception as e:
                print(f"启用用户失败: {e}")
            
            return user_id
        except self.client.exceptions.ConflictException:
            # 用户已存在，尝试获取
            return self.get_user_by_username(username)
        except Exception as e:
            print(f"创建 IDC 用户失败: {e}")
            return None
    
    def get_user_by_username(self, username: str) -> Optional[str]:
        """根据用户名获取 IDC User ID"""
        try:
            response = self.client.list_users(
                IdentityStoreId=self.store_id,
                Filters=[{
                    'AttributePath': 'UserName',
                    'AttributeValue': username
                }]
            )
            if response['Users']:
                return response['Users'][0]['UserId']
            return None
        except Exception:
            return None
    
    def delete_user(self, user_id: str) -> bool:
        """删除 IDC 用户"""
        try:
            self.client.delete_user(
                IdentityStoreId=self.store_id,
                UserId=user_id
            )
            return True
        except Exception as e:
            print(f"删除 IDC 用户失败: {e}")
            return False
    
    def disable_user(self, user_id: str) -> bool:
        """禁用 IDC 用户"""
        try:
            self.client.update_user(
                IdentityStoreId=self.store_id,
                UserId=user_id,
                Operations=[{
                    'AttributePath': 'active',
                    'AttributeValue': 'false'
                }]
            )
            return True
        except Exception as e:
            print(f"禁用 IDC 用户失败: {e}")
            return False
    
    def enable_user(self, user_id: str) -> bool:
        """启用 IDC 用户"""
        try:
            self.client.update_user(
                IdentityStoreId=self.store_id,
                UserId=user_id,
                Operations=[{
                    'AttributePath': 'active',
                    'AttributeValue': 'true'
                }]
            )
            return True
        except Exception as e:
            print(f"启用 IDC 用户失败: {e}")
    
    def add_user_to_group(self, user_id: str, group_id: str) -> bool:
        """将用户添加到组"""
        try:
            self.client.create_group_membership(
                IdentityStoreId=self.store_id,
                GroupId=group_id,
                MemberId={'UserId': user_id}
            )
            print(f"用户 {user_id} 已添加到组 {group_id}")
            return True
        except self.client.exceptions.ConflictException:
            # 已经是组成员
            print(f"用户 {user_id} 已在组 {group_id} 中")
            return True
        except Exception as e:
            print(f"添加用户到组失败: {e}")
            return False


# 单例
idc_service = IDCService()
