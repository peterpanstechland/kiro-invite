"""Lambda 定时清理 handler"""
import json
from app.services.scheduler import scheduler


def handler(event, context):
    """EventBridge 触发的定时清理"""
    print("开始执行定时清理...")
    
    try:
        results = scheduler.check_expired_accounts()
        print(f"清理完成: {json.dumps(results, ensure_ascii=False)}")
        
        return {
            "statusCode": 200,
            "body": json.dumps(results, ensure_ascii=False)
        }
    except Exception as e:
        print(f"清理失败: {e}")
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)})
        }
