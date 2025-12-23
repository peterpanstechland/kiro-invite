# Kiro Invite - 企业账号邀请管理系统

基于 AWS IAM Identity Center 的 Kiro IDE 账号管理系统，支持批量创建邀请链接、学生自助认领账号、SSO 单点登录管理。

## 功能特性

- 🔐 **AWS SSO 单点登录** - 管理员通过 IAM Identity Center 认证
- 🎫 **批量创建邀请链接** - 支持多等级、自定义有效期
- 👤 **学生自助认领** - 填写邮箱即可获得账号
- 🔄 **自动用户管理** - 自动在 IAM Identity Center 创建用户并分配组
- ⏰ **自动过期清理** - 每日自动删除过期账号
- ☁️ **Serverless 架构** - Lambda + DynamoDB，按需付费

## 架构图

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Lambda API    │────▶│  IAM Identity   │
│   (Vercel)      │     │   (FastAPI)     │     │    Center       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │
        │                       ▼
        │               ┌─────────────────┐
        │               │    DynamoDB     │
        │               └─────────────────┘
        │
        ▼
┌─────────────────┐     ┌─────────────────┐
│  Cognito        │────▶│  IAM Identity   │
│  (SAML SSO)     │     │  Center (IdP)   │
└─────────────────┘     └─────────────────┘
```

## 快速开始

详细部署指南请参考：[📖 部署指南](docs/DEPLOYMENT_GUIDE.md)

### 前置条件

- AWS 账号，已启用 IAM Identity Center
- AWS CLI 已配置
- Python 3.11
- Node.js 18+
- AWS SAM CLI

### 部署步骤概览

1. **部署后端**（SAM 自动创建）
   ```bash
   cd backend
   sam build && sam deploy --guided
   ```

2. **配置 IAM Identity Center SAML 应用**（⚠️ AWS Console 手动）
   - 创建 Custom SAML 2.0 应用
   - 配置 ACS URL 和 Audience
   - 配置 Attribute Mappings
   - 分配管理员用户

3. **配置 Cognito SAML Provider**（⚠️ AWS Console 手动）
   - 添加 SAML Identity Provider
   - 上传 IAM Identity Center metadata
   - 配置 Attribute Mapping

4. **部署前端**
   ```bash
   cd frontend
   npx vercel --prod
   ```

## 本地开发

### 后端

```bash
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1  # Windows
pip install -r requirements.txt

# 配置 .env 文件（参考 .env.example）

uvicorn app.main:app --reload --port 8000
```

### 前端

```bash
cd frontend
npm install

# 配置 .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

npm run dev
```

## 使用说明

### 管理员登录

1. 访问前端登录页面
2. 输入 AWS SSO Portal URL（如 `https://d-xxxxxxxxxx.awsapps.com/start`）
3. 点击登录，跳转到 AWS SSO 进行身份验证
4. 验证成功后自动返回管理后台

### 创建邀请

1. 在"邀请链接"标签页设置：
   - 数量：1-100
   - 等级：Free / Pro / Pro+ / Power
   - 到期日期
2. 点击创建，复制链接发送给学生

### 学生认领

1. 打开邀请链接
2. 填写邮箱和姓名
3. 点击认领
4. 前往 SSO 登录页面，使用"Forgot password"设置密码
5. 使用新密码登录 Kiro IDE

## API 文档

启动后端后访问：`http://localhost:8000/api/docs`

### 主要接口

| 接口 | 方法 | 认证 | 说明 |
|------|------|------|------|
| `/api/invites/create` | POST | ✅ | 批量创建邀请 |
| `/api/invites/list` | GET | ✅ | 列出所有邀请 |
| `/api/invites/{token}` | DELETE | ✅ | 撤销邀请 |
| `/api/invites/info/{token}` | GET | ❌ | 获取邀请信息 |
| `/api/invites/claim/{token}` | POST | ❌ | 认领邀请 |
| `/api/users/list` | GET | ✅ | 列出所有用户 |
| `/api/users/{id}` | DELETE | ✅ | 删除用户 |

## 项目结构

```
├── backend/
│   ├── app/
│   │   ├── api/           # API 路由
│   │   ├── models/        # 数据模型
│   │   ├── services/      # 业务服务（IDC、认证、数据库）
│   │   ├── config.py      # 配置
│   │   └── main.py        # FastAPI 入口
│   ├── template.yaml      # SAM 模板
│   └── requirements.txt
├── frontend/
│   ├── src/app/
│   │   ├── page.tsx       # 管理后台
│   │   ├── login/         # SSO 登录页
│   │   ├── auth/callback/ # OAuth 回调
│   │   └── claim/         # 邀请认领页
│   └── package.json
├── docs/
│   ├── DEPLOYMENT_GUIDE.md  # 完整部署指南
│   └── SAML_SETUP.md        # SAML 配置说明
└── infra/
    └── iam-policy.json    # IAM 策略参考
```

## 常见问题

### SAML 登录返回 "Bad input"

IAM Identity Center 应用配置问题，请检查：
1. ACS URL 是否正确
2. Attribute Mappings 是否配置
3. 用户是否已分配到应用

### "Invalid user attributes: emails"

Cognito 和 IAM Identity Center 的属性映射不匹配：
1. IAM Identity Center: 添加 `emails` → `${user:email}`
2. Cognito: 配置 `email` ← `emails`

### 学生收不到密码重置邮件

确保在 IAM Identity Center → Settings → Authentication 中启用了 "Allow users to reset their password"

## License

AGPL-3.0
