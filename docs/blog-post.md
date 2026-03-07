# 用 AWS IAM Identity Center 给学生批量分发 Kiro IDE 账号

*How I Built a Kiro Account Invite System with AWS IAM Identity Center*

---

## 背景 / Background

Kiro 是 AWS 推出的 AI 辅助编程 IDE，支持通过 IAM Identity Center (IDC) 进行企业级 SSO 登录。我需要给一批学生分发 Kiro Pro 账号，但 Kiro 控制台只能手动一个个添加用户，效率极低。

*Kiro is an AI-powered IDE from AWS that supports enterprise SSO via IAM Identity Center. I needed to distribute Kiro Pro accounts to a group of students, but the Kiro console only allows manual one-by-one user addition — extremely inefficient.*

于是我决定自己搭一套邀请系统：管理员批量生成邀请链接，学生点链接填邮箱自助认领，后端自动在 IDC 创建账号并加入对应用户组。

*So I built an invite system: admins generate batch invite links, students self-register by clicking the link and entering their email, and the backend automatically creates IDC accounts and assigns them to the appropriate group.*

---

## 系统架构 / Architecture

```
管理员 (Admin)
    │
    ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  Next.js 前端   │────▶│  Lambda (FastAPI) │────▶│  IAM Identity Center│
│  (Vercel)       │     │  + DynamoDB       │     │  (用户/组管理)       │
└─────────────────┘     └──────────────────┘     └─────────────────────┘
         │                       │
         │ Cognito SAML SSO      │ EventBridge
         ▼                       ▼
┌─────────────────┐     ┌──────────────────┐
│  管理员登录认证  │     │  每日定时清理     │
│  (Cognito+IDC)  │     │  过期账号         │
└─────────────────┘     └──────────────────┘

学生 (Student)
    │
    ▼ 点击邀请链接
┌─────────────────┐
│  认领页面        │
│  填写邮箱 → 自动 │
│  创建 IDC 账号   │
└─────────────────┘
```

**技术栈 / Tech Stack：**
- 后端：Python FastAPI + AWS Lambda (SAM)
- 数据库：DynamoDB
- 前端：Next.js 14 + Tailwind CSS (Vercel)
- 认证：AWS Cognito + IAM Identity Center SAML SSO
- 定时任务：EventBridge + Lambda

---

## 核心流程 / Core Flow

### 管理员侧 / Admin Side

1. 通过 Cognito SAML SSO 登录（联动 IAM Identity Center）
2. 选择 Tier（Pro / Pro+ / Power）和到期日期，批量生成邀请链接
3. 将链接发给学生

### 学生侧 / Student Side

1. 打开邀请链接，填写邮箱（可选填姓名）
2. 后端自动：
   - 在 IDC 创建用户（用户名格式：`kiro_<email前缀>`）
   - 将用户加入对应 Tier 的 IDC 用户组
3. 学生前往 SSO 登录页，输入用户名，收验证码邮件，设置密码
4. 联系管理员手动在 Kiro 控制台添加 Subscription（见下方踩坑）
5. 下载 Kiro IDE，用 IAM Identity Center 方式登录

---

## 关键实现 / Key Implementation

### 1. IDC 用户创建

```python
# backend/app/services/idc.py
def create_user(self, username: str, email: str, display_name: str) -> Optional[str]:
    response = self.client.create_user(
        IdentityStoreId=self.identity_store_id,
        UserName=username,
        Name={"FamilyName": "Kiro", "GivenName": display_name},
        DisplayName=display_name,
        Emails=[{"Value": email, "Type": "work", "Primary": True}]
    )
    return response.get("UserId")

def add_user_to_group(self, user_id: str, group_id: str) -> bool:
    self.client.create_group_membership(
        IdentityStoreId=self.identity_store_id,
        GroupId=group_id,
        MemberId={"UserId": user_id}
    )
    return True
```

### 2. 邀请认领 API

```python
# backend/app/api/invites.py
@router.post("/claim/{token}")
async def claim_invite(token: str, req: ClaimRequest):
    invite = db.get_invite(token)
    
    # 验证邀请有效性（状态、过期时间）
    now = datetime.now(BEIJING_TZ)
    exp = datetime.fromisoformat(invite["expires_at"]).replace(tzinfo=BEIJING_TZ)
    if exp < now:
        return ClaimResponse(success=False, error="该邀请已过期")
    
    # 创建 IDC 用户并加入用户组
    idc_user_id = idc_service.create_user(username, email, display_name)
    group_id = settings.get_group_id(invite["tier"])
    idc_service.add_user_to_group(idc_user_id, group_id)
    
    # 写入数据库
    db.insert_user({...})
    db.update_invite(token, {"status": "CLAIMED"})
```

### 3. 自动过期清理

每天北京时间 23:50 由 EventBridge 触发 Lambda，删除过期的 IDC 账号：

```python
# backend/app/services/scheduler.py
BEIJING_TZ = timezone(timedelta(hours=8))

def check_expired_accounts(self):
    now = datetime.now(BEIJING_TZ)
    for user in db.get_users(status="ACTIVE"):
        expire_time = datetime.fromisoformat(user["expires_at"])
        if expire_time.tzinfo is None:
            expire_time = expire_time.replace(tzinfo=BEIJING_TZ)
        if now >= expire_time:
            idc_service.delete_user(user["idc_user_id"])
            db.update_user(user["user_id"], {"status": "DELETED"})
```

### 4. 管理员认证（Cognito + SAML）

管理员登录走 Cognito Hosted UI → SAML → IAM Identity Center，拿到 JWT Token 后调用 API：

```python
# backend/app/services/auth.py
def verify_token(self, token: str) -> Optional[dict]:
    # 从 Cognito JWKS 获取公钥验证 JWT
    jwks_url = f"https://cognito-idp.{self.region}.amazonaws.com/{self.user_pool_id}/.well-known/jwks.json"
    # ... 验证签名、过期时间、audience
```

---

## 踩坑记录 / Lessons Learned

### 坑 1：Kiro Subscription 无法通过用户组自动生效

*Pitfall 1: Kiro Subscriptions don't auto-activate via group assignment*

**现象：** 把用户加入 `kiro-pro` 组，并将该组分配到 KiroProfile 应用，但 Kiro 控制台的 Subscriptions 页面显示 "Pending"，用户无法使用 Kiro。

**根因：** Kiro 的 Subscription 激活是内部服务处理的，Group 分配只是权限层面，不会自动触发 Subscription 创建。手动在 Kiro 控制台 → Subscriptions → Add user 才能立即生效。

**目前方案：** 学生认领账号后，管理员手动在 Kiro 控制台添加 Subscription。这是当前 Kiro 的限制，没有公开 API 可以查询或创建 Subscription 状态。

*The Kiro Subscription activation is handled by an internal service. Group assignment only covers permissions, not subscription creation. Manual addition in the Kiro console is currently the only reliable method.*

---

### 坑 2：Lambda 时区问题导致清理任务失效

*Pitfall 2: Lambda timezone mismatch breaks the cleanup job*

**现象：** 定时清理任务运行了，日志显示 `"expired": 0`，但过期账号明明存在。

**根因：** Lambda 运行在 UTC 时区，`datetime.now()` 返回 UTC 时间。数据库中存的是北京时间（如 `2025-12-24T23:50:00`），比较时把北京时间当 UTC 处理，导致时间差了 8 小时，过期判断永远不成立。

**修复：**
```python
# ❌ 错误
now = datetime.now()  # UTC 时间
expire_time = datetime.fromisoformat("2025-12-24T23:50:00")  # 被当作 UTC

# ✅ 正确
BEIJING_TZ = timezone(timedelta(hours=8))
now = datetime.now(BEIJING_TZ)
expire_time = datetime.fromisoformat("2025-12-24T23:50:00").replace(tzinfo=BEIJING_TZ)
```

同样的问题也出现在 `invites.py` 中的 `datetime.utcnow()` 调用，全部统一改为 `datetime.now(BEIJING_TZ)`。

*The same issue appeared in `invites.py` with `datetime.utcnow()` calls — all unified to `datetime.now(BEIJING_TZ)`.*

---

### 坑 3：Lambda 环境变量缺失导致用户组分配失败

*Pitfall 3: Missing Lambda env vars cause group assignment to silently fail*

**现象：** 学生认领成功，IDC 账号创建了，但没有被加入用户组。

**根因：** SAM `template.yaml` 的 `Globals.Function.Environment` 里没有配置 `IDENTITY_STORE_ID` 和 `IDC_GROUP_*` 变量，Lambda 读到空值，`get_group_id()` 返回 `None`，静默跳过了组分配。

**修复：** 在 `template.yaml` 中补充环境变量，或通过 `aws lambda update-function-configuration` 手动更新。

---

### 坑 4：SAML 配置的 Attribute Mapping 顺序很重要

*Pitfall 4: SAML attribute mapping order matters*

配置 Cognito + IAM Identity Center SAML 时，需要在**两个地方**都配置属性映射，缺一不可：

1. **IAM Identity Center 应用侧**：添加 `emails` → `${user:email}`
2. **Cognito SAML Provider 侧**：配置 `email` ← `emails`

漏掉任何一个都会导致登录后 Cognito 拿不到用户邮箱，报 `"Invalid user attributes: emails"` 错误。

---

## 部署步骤概览 / Deployment Overview

### 前置条件

- AWS 账号 + IAM Identity Center 已启用
- AWS CLI + SAM CLI 已配置
- Node.js 18+ / Python 3.11

### 1. 部署后端

```bash
cd backend
cp .env.example .env  # 填写 IDENTITY_STORE_ID、IDC_GROUP_* 等
sam build
sam deploy --guided
```

### 2. 配置 IAM Identity Center SAML 应用（手动）

在 AWS Console → IAM Identity Center → Applications：
- 创建 Custom SAML 2.0 应用
- ACS URL: `https://<CognitoDomain>/saml2/idpresponse`
- Audience: `urn:amazon:cognito:sp:<UserPoolId>`
- Attribute Mapping: `emails` → `${user:email}`
- 下载 metadata XML

### 3. 配置 Cognito SAML Provider（手动）

在 AWS Console → Cognito → User Pool → Sign-in experience：
- 添加 SAML Identity Provider，上传 metadata XML
- Attribute Mapping: `email` ← `emails`
- App Client Hosted UI 配置回调 URL

### 4. 部署前端

```bash
cd frontend
# 配置 .env.local: NEXT_PUBLIC_API_URL=<Lambda API URL>
npx vercel --prod
```

### 5. 更新 Lambda 环境变量

```bash
# 确保 CleanupFunction 和 KiroInviteFunction 都有以下变量
aws lambda update-function-configuration \
  --function-name kiro-invite-KiroInviteFunction-xxx \
  --environment "Variables={IDENTITY_STORE_ID=d-xxx,IDC_GROUP_PRO=xxx,...}"
```

---

## 安全注意事项 / Security Notes

- **不要把 `lambda-env.json` 提交到 Git**，已加入 `.gitignore`
- 管理员密码使用强密码，不要用默认的 `admin`
- Lambda IAM Role 只授予 `identitystore:*` 权限，不要给 `iam:*`
- 定期检查 IDC 用户列表，确认过期账号已被清理

---

## 源码 / Source Code

项目已开源：[github.com/peterpanstechland/kiro-invite](https://github.com/peterpanstechland/kiro-invite)

包含完整的部署指南：[docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md)

---

*如果你也在给团队或学生分发 Kiro 账号，希望这篇文章对你有帮助。有问题欢迎在 GitHub Issues 提出。*

*If you're also distributing Kiro accounts to a team or students, I hope this post helps. Feel free to open a GitHub Issue with any questions.*
