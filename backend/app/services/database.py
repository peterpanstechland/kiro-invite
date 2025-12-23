"""SQLite 数据库服务"""
import sqlite3
import json
from typing import Dict, List, Optional, Any
from datetime import datetime
from pathlib import Path


class Database:
    """SQLite 数据库管理"""
    
    def __init__(self, db_path: str = "data/kiro_invite.db"):
        self.db_path = db_path
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self._init_tables()
    
    def _get_conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    def _init_tables(self):
        """初始化数据库表"""
        conn = self._get_conn()
        cursor = conn.cursor()
        
        # 邀请表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS invites (
                token TEXT PRIMARY KEY,
                status TEXT DEFAULT 'PENDING',
                tier TEXT DEFAULT 'Pro',
                entitlement_days INTEGER DEFAULT 90,
                created_at TEXT,
                expires_at TEXT,
                claimed_at TEXT,
                claimed_email TEXT,
                claimed_user_id TEXT,
                note TEXT,
                identity_store_id TEXT,
                sso_url TEXT
            )
        ''')
        
        # 用户表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                user_id TEXT PRIMARY KEY,
                username TEXT UNIQUE,
                email TEXT,
                display_name TEXT,
                status TEXT DEFAULT 'ACTIVE',
                tier TEXT,
                idc_user_id TEXT,
                created_at TEXT,
                expires_at TEXT,
                invite_token TEXT,
                identity_store_id TEXT,
                sso_url TEXT,
                deleted_at TEXT,
                expired_at TEXT
            )
        ''')
        
        conn.commit()
        conn.close()
    
    # ==================== 邀请操作 ====================
    
    def insert_invite(self, invite: Dict) -> bool:
        conn = self._get_conn()
        cursor = conn.cursor()
        try:
            cursor.execute('''
                INSERT INTO invites (token, status, tier, entitlement_days, created_at, 
                    expires_at, note, identity_store_id, sso_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                invite['token'],
                invite.get('status', 'PENDING'),
                invite.get('tier', 'Pro'),
                invite.get('entitlement_days', 90),
                invite.get('created_at', datetime.now().isoformat()),
                invite.get('expires_at'),
                invite.get('note'),
                invite.get('identity_store_id'),
                invite.get('sso_url')
            ))
            conn.commit()
            return True
        except Exception as e:
            print(f"插入邀请失败: {e}")
            return False
        finally:
            conn.close()
    
    def get_invite(self, token: str) -> Optional[Dict]:
        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM invites WHERE token = ?', (token,))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None
    
    def get_invites(self, identity_store_id: Optional[str] = None, status: Optional[str] = None) -> List[Dict]:
        conn = self._get_conn()
        cursor = conn.cursor()
        
        query = 'SELECT * FROM invites WHERE 1=1'
        params = []
        
        if identity_store_id:
            query += ' AND identity_store_id = ?'
            params.append(identity_store_id)
        if status:
            query += ' AND status = ?'
            params.append(status)
        
        query += ' ORDER BY created_at DESC'
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]
    
    def update_invite(self, token: str, updates: Dict) -> bool:
        conn = self._get_conn()
        cursor = conn.cursor()
        
        set_clause = ', '.join([f'{k} = ?' for k in updates.keys()])
        values = list(updates.values()) + [token]
        
        cursor.execute(f'UPDATE invites SET {set_clause} WHERE token = ?', values)
        conn.commit()
        affected = cursor.rowcount
        conn.close()
        return affected > 0
    
    # ==================== 用户操作 ====================
    
    def insert_user(self, user: Dict) -> bool:
        conn = self._get_conn()
        cursor = conn.cursor()
        try:
            cursor.execute('''
                INSERT INTO users (user_id, username, email, display_name, status, tier,
                    idc_user_id, created_at, expires_at, invite_token, identity_store_id, sso_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                user['user_id'],
                user['username'],
                user['email'],
                user.get('display_name'),
                user.get('status', 'ACTIVE'),
                user.get('tier'),
                user.get('idc_user_id'),
                user.get('created_at', datetime.now().isoformat()),
                user.get('expires_at'),
                user.get('invite_token'),
                user.get('identity_store_id'),
                user.get('sso_url')
            ))
            conn.commit()
            return True
        except Exception as e:
            print(f"插入用户失败: {e}")
            return False
        finally:
            conn.close()
    
    def get_user(self, user_id: str) -> Optional[Dict]:
        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM users WHERE user_id = ?', (user_id,))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None
    
    def get_user_by_email(self, email: str, identity_store_id: Optional[str] = None) -> Optional[Dict]:
        conn = self._get_conn()
        cursor = conn.cursor()
        
        if identity_store_id:
            cursor.execute('SELECT * FROM users WHERE email = ? AND identity_store_id = ?', 
                          (email, identity_store_id))
        else:
            cursor.execute('SELECT * FROM users WHERE email = ?', (email,))
        
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None
    
    def get_user_by_username(self, username: str, identity_store_id: Optional[str] = None) -> Optional[Dict]:
        conn = self._get_conn()
        cursor = conn.cursor()
        
        if identity_store_id:
            cursor.execute('SELECT * FROM users WHERE username = ? AND identity_store_id = ?',
                          (username, identity_store_id))
        else:
            cursor.execute('SELECT * FROM users WHERE username = ?', (username,))
        
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None
    
    def get_users(self, identity_store_id: Optional[str] = None, status: Optional[str] = None) -> List[Dict]:
        conn = self._get_conn()
        cursor = conn.cursor()
        
        query = 'SELECT * FROM users WHERE 1=1'
        params = []
        
        if identity_store_id:
            query += ' AND identity_store_id = ?'
            params.append(identity_store_id)
        if status:
            query += ' AND status = ?'
            params.append(status)
        
        query += ' ORDER BY created_at DESC'
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]
    
    def update_user(self, user_id: str, updates: Dict) -> bool:
        conn = self._get_conn()
        cursor = conn.cursor()
        
        set_clause = ', '.join([f'{k} = ?' for k in updates.keys()])
        values = list(updates.values()) + [user_id]
        
        cursor.execute(f'UPDATE users SET {set_clause} WHERE user_id = ?', values)
        conn.commit()
        affected = cursor.rowcount
        conn.close()
        return affected > 0
    
    def delete_user(self, user_id: str) -> bool:
        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute('DELETE FROM users WHERE user_id = ?', (user_id,))
        conn.commit()
        affected = cursor.rowcount
        conn.close()
        return affected > 0


# 单例
db = Database()
