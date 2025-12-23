"""简单的内存/文件数据库"""
import json
import os
from typing import Dict, List, Optional, Any
from datetime import datetime


class SimpleDB:
    """简单的 JSON 文件数据库"""
    
    def __init__(self, data_dir: str = "data"):
        self.data_dir = data_dir
        os.makedirs(data_dir, exist_ok=True)
    
    def _get_file(self, collection: str) -> str:
        return os.path.join(self.data_dir, f"{collection}.json")
    
    def _load(self, collection: str) -> List[Dict]:
        file_path = self._get_file(collection)
        if os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        return []
    
    def _save(self, collection: str, data: List[Dict]):
        file_path = self._get_file(collection)
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2, default=str)
    
    def insert(self, collection: str, doc: Dict) -> bool:
        data = self._load(collection)
        data.append(doc)
        self._save(collection, data)
        return True
    
    def find(self, collection: str, query: Optional[Dict] = None) -> List[Dict]:
        data = self._load(collection)
        if not query:
            return data
        return [d for d in data if all(d.get(k) == v for k, v in query.items())]
    
    def find_one(self, collection: str, query: Dict) -> Optional[Dict]:
        results = self.find(collection, query)
        return results[0] if results else None
    
    def update(self, collection: str, query: Dict, update: Dict) -> bool:
        data = self._load(collection)
        updated = False
        for doc in data:
            if all(doc.get(k) == v for k, v in query.items()):
                doc.update(update)
                updated = True
                break
        if updated:
            self._save(collection, data)
        return updated
    
    def delete(self, collection: str, query: Dict) -> bool:
        data = self._load(collection)
        new_data = [d for d in data if not all(d.get(k) == v for k, v in query.items())]
        if len(new_data) < len(data):
            self._save(collection, new_data)
            return True
        return False


# 单例
db = SimpleDB()


# 便捷方法
def get_users() -> List[Dict]:
    return db.find("users")


def update_user(user_id: str, update: Dict) -> bool:
    return db.update("users", {"user_id": user_id}, update)
