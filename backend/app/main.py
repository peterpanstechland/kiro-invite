"""Kiro Invite - 精简版学生账号管理"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
import asyncio

from app.api import invites, users, admin
from app.config import settings

# 定时任务
async def scheduled_cleanup():
    """每天 23:50 检查过期账号，23:55 确认删除"""
    from app.services.scheduler import scheduler
    from datetime import datetime, time, timedelta
    
    while True:
        now = datetime.now()
        
        # 计算下一个 23:50
        target_time = datetime.combine(now.date(), time(23, 50))
        if now >= target_time:
            # 如果今天已过 23:50，则等到明天
            target_time = target_time + timedelta(days=1)
        
        # 等待到 23:50
        wait_seconds = (target_time - now).total_seconds()
        print(f"[定时清理] 下次执行时间: {target_time.strftime('%Y-%m-%d %H:%M')}, 等待 {wait_seconds/3600:.1f} 小时")
        await asyncio.sleep(wait_seconds)
        
        # 23:50 执行删除
        try:
            results = scheduler.check_expired_accounts()
            print(f"[定时清理 23:50] 完成: 检查 {results['checked']} 个, 过期 {results['expired']} 个, 处理 {results['processed']} 个")
            print(f"[定时清理 23:50] 详情: {results['details']}")
        except Exception as e:
            print(f"[定时清理 23:50] 失败: {e}")
        
        # 等待 5 分钟到 23:55
        await asyncio.sleep(300)
        
        # 23:55 确认删除结果
        try:
            results = scheduler.check_expired_accounts()
            print(f"[定时清理 23:55] 确认: 检查 {results['checked']} 个, 剩余过期 {results['expired']} 个")
        except Exception as e:
            print(f"[定时清理 23:55] 确认失败: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时
    task = asyncio.create_task(scheduled_cleanup())
    yield
    # 关闭时
    task.cancel()


app = FastAPI(
    title="Kiro Invite",
    description="学生账号邀请管理系统",
    version="1.0.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(invites.router, prefix="/api/invites", tags=["Invites"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(admin.router, prefix="/api", tags=["Admin"])


@app.get("/api/health")
async def health():
    return {"status": "ok"}


# Lambda handler
handler = Mangum(app)
