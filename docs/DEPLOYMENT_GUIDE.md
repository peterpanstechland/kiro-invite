# Kiro Invite 部署指南

## 系统概述

Kiro Invite 是一个企业账号邀请管理系统，用于管理 AWS IAM Identity Center 中的用户账号。

### 架构

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

### 认证流程

1. 管理员访问前端登录页面
2. 输入 AWS SSO Portal URL
3. 点击登录，跳转到 Cognito Hosted UI
4. Cognito 通过 SAML 重定向到 IAM Identity Center
5. 用户在 IAM Identity Center 登录
6. 登录成功后返回 Cognito，获取 JWT Token
7. 前端使用 JWT Token 调用 Lambda API

---

## 前置条件

- AWS 账号，已启用 IAM Identity Center
- AWS CLI 已配置
- Python 3.11
- Node.js 18+
- AWS SAM CLI
- Vercel 账号（用于前端部署）

---

## 第一步：获取 AWS 信息

### 1.1 获取 Identity Store ID（⚠️ AWS Console）

1. 登录 AWS Console
2. 进入 **IAM Identity Center** → **Settings**
3. 记录 **Identity store ID**（格式：`d-xxxxxxxxxx`）
4. 记录 **AWS access portal URL**（格式：`https://d-xxxxxxxxxx.awsapps.com/start`）

### 1.2 创建 IDC Groups（⚠️ AWS Console）

在 IAM Identity Center → Groups 中创建以下组：

| Group Name | 用途 |
|------------|------|
| KiroPro | Pro 等级用户 |
| KiroProPlus | Pro+ 等级用户 |
| KiroPower | Power 等级用户 |

记录每个组的 **Group ID**。

---

## 第二步：部署后端（Lambda + DynamoDB）

### 2.1 配置 samconfig.toml

```toml
version = 0.1

[default.deploy.parameters]
stack_name = "kiro-invite"
resolve_s3 = true
s3_prefix = "kiro-invite"
region = "us-east-1"
confirm_changeset = true
capabilities = "CAPABILITY_IAM"
parameter_overrides = "FrontendDomain=\"your-app.vercel.app\" AdminPassword=\"your-secure-password\""
```

### 2.2 部署

```bash
cd backend
sam build
sam deploy --guided  # 首次部署
# 或
sam deploy  # 后续部署
```

### 2.3 记录输出

部署完成后记录：
- **ApiUrl**: Lambda API 地址
- **CognitoUserPoolId**: Cognito 用户池 ID
- **CognitoClientId**: Cognito 客户端 ID
- **CognitoDomain**: Cognito 域名

---

## 第三步：配置 IAM Identity Center SAML 应用（⚠️ AWS Console）

### 3.1 创建 SAML 应用

1. 进入 **IAM Identity Center** → **Applications**
2. 点击 **Add application**
3. 选择 **I have an application I want to set up**
4. 选择 **SAML 2.0**
5. 点击 **Next**

### 3.2 配置应用

填写以下信息：

| 字段 | 值 |
|------|-----|
| Display name | `Kiro Invite Admin` |
| Description | `Kiro Invite 管理系统` |

在 **Application metadata** 部分，选择 **Manually type your metadata values**：

| 字段 | 值 |
|------|-----|
| Application ACS URL | `https://<CognitoDomain>/saml2/idpresponse` |
| Application SAML audience | `urn:amazon:cognito:sp:<CognitoUserPoolId>` |

**示例：**
- ACS URL: `https://kiro-invite-242201290799.auth.us-east-1.amazoncognito.com/saml2/idpresponse`
- Audience: `urn:amazon:cognito:sp:us-east-1_TJLzUElHy`

### 3.3 配置 Attribute Mappings（⚠️ 重要）

创建应用后，点击 **Actions** → **Edit attribute mappings**，添加：

| User attribute in the application | Maps to | Format |
|-----------------------------------|---------|--------|
| Subject | `${user:email}` | emailAddress |
| emails | `${user:email}` | unspecified |

### 3.4 分配用户

1. 在应用详情页，点击 **Assign users and groups**
2. 选择要授权的管理员用户
3. 点击 **Assign**

### 3.5 下载 SAML Metadata

1. 点击 **Actions** → **Edit configuration**
2. 在 **IAM Identity Center metadata** 部分，点击 **Download** 下载 metadata XML 文件
3. 保存此文件，后续配置 Cognito 时需要

---

## 第四步：配置 Cognito SAML Provider（⚠️ AWS Console）

### 4.1 添加 Identity Provider

1. 进入 **Amazon Cognito** → **User pools** → 选择你的用户池
2. 点击 **Sign-in experience** 标签
3. 在 **Federated identity provider sign-in** 部分，点击 **Add identity provider**
4. 选择 **SAML**

### 4.2 配置 SAML Provider

| 字段 | 值 |
|------|-----|
| Provider name | `AwsSSO` |
| Metadata document | 上传第三步下载的 XML 文件 |

### 4.3 配置 Attribute Mapping

| User pool attribute | SAML attribute |
|---------------------|----------------|
| email | emails |

点击 **Add identity provider** 保存。

### 4.4 配置 App Client

1. 进入 **App integration** → **App clients** → 选择你的客户端
2. 点击 **Edit hosted UI**
3. 配置：

**Allowed callback URLs:**
```
https://your-app.vercel.app/auth/callback
http://localhost:3000/auth/callback
```

**Allowed sign-out URLs:**
```
https://your-app.vercel.app
https://your-app.vercel.app/login
http://localhost:3000
http://localhost:3000/login
```

**Identity providers:** 勾选 `AwsSSO`

**OAuth 2.0 grant types:** 勾选 `Authorization code grant`

**OpenID Connect scopes:** 勾选 `email`, `openid`, `profile`

---

## 第五步：部署前端（Vercel）

### 5.1 配置环境变量

在 Vercel 项目设置中添加环境变量：

| 变量名 | 值 |
|--------|-----|
| NEXT_PUBLIC_API_URL | Lambda API URL（如 `https://xxx.execute-api.us-east-1.amazonaws.com`）|

### 5.2 部署

```bash
cd frontend
npx vercel --prod
```

---

## 第六步：本地开发配置

### 6.1 后端 .env 文件

```env
# AWS Configuration
AWS_REGION=us-east-1
IDENTITY_STORE_ID=d-xxxxxxxxxx

# IDC Group IDs
IDC_GROUP_PRO=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
IDC_GROUP_PRO_PLUS=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
IDC_GROUP_POWER=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# App Settings
FRONTEND_URL=http://localhost:3000
CORS_ORIGINS=["http://localhost:3000"]

# Cognito Configuration
COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
COGNITO_REGION=us-east-1
```

### 6.2 前端 .env.local 文件

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 6.3 启动本地服务

```bash
# 后端
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1  # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 前端
cd frontend
npm install
npm run dev
```

---

## 常见问题排查

### 问题 1: SAML 登录返回 "Bad input"

**原因：** IAM Identity Center 应用的 metadata endpoint 无效

**解决：**
1. 删除 IAM Identity Center 中的应用
2. 重新创建应用
3. 重新下载 metadata 并上传到 Cognito

### 问题 2: "Invalid user attributes: emails"

**原因：** Cognito 期望的属性名与 SAML 响应中的不匹配

**解决：**
1. 在 IAM Identity Center 应用的 attribute mapping 中添加 `emails` → `${user:email}`
2. 在 Cognito 的 AwsSSO provider 中配置 attribute mapping: `email` ← `emails`

### 问题 3: CORS 错误

**原因：** 后端 CORS 配置不正确

**解决：**
1. 确保 `template.yaml` 中的 `FrontendDomain` 参数正确
2. 重新部署后端

### 问题 4: "Could not find resource for full path"

**原因：** IAM Identity Center 应用配置损坏

**解决：**
1. 删除并重新创建 IAM Identity Center 应用
2. 确保 ACS URL 和 Audience 配置正确

---

## 配置清单

### AWS Console 手动配置项

- [ ] IAM Identity Center Groups（KiroPro, KiroProPlus, KiroPower）
- [ ] IAM Identity Center SAML Application
- [ ] IAM Identity Center Attribute Mappings
- [ ] IAM Identity Center User Assignment
- [ ] Cognito SAML Identity Provider (AwsSSO)
- [ ] Cognito App Client Hosted UI 配置

### 自动部署项（SAM）

- [x] Lambda Function
- [x] DynamoDB Tables
- [x] API Gateway
- [x] Cognito User Pool
- [x] Cognito App Client
- [x] Cognito Domain
- [x] EventBridge Cleanup Schedule
- [x] IAM Roles and Policies

---

## 安全注意事项

1. **不要在代码中硬编码密码**，使用环境变量或 AWS Secrets Manager
2. **限制 IAM Identity Center 应用的用户分配**，只授权给管理员
3. **定期轮换 Cognito App Client Secret**（如果使用）
4. **启用 CloudTrail** 记录 API 调用日志
5. **配置 WAF** 保护 API Gateway（可选）

---

## 更新部署

### 更新后端

```bash
cd backend
sam build
sam deploy
```

### 更新前端

```bash
cd frontend
npx vercel --prod
```


---

## CI/CD 自动部署（GitHub Actions）

### 配置 GitHub Secrets

在 GitHub 仓库的 **Settings** → **Secrets and variables** → **Actions** 中添加以下 secrets：

#### AWS 部署所需

| Secret 名称 | 说明 | 示例 |
|-------------|------|------|
| `AWS_ACCESS_KEY_ID` | AWS IAM 用户 Access Key | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM 用户 Secret Key | `wJal...` |
| `FRONTEND_DOMAIN` | 前端域名 | `kiro-invite.vercel.app` |
| `ADMIN_PASSWORD` | 管理员密码（备用） | `YourSecurePassword123!` |

#### Vercel 部署所需

| Secret 名称 | 说明 | 获取方式 |
|-------------|------|----------|
| `VERCEL_TOKEN` | Vercel API Token | Vercel Dashboard → Settings → Tokens |
| `NEXT_PUBLIC_API_URL` | Lambda API URL | SAM 部署输出的 ApiUrl |

### 获取 Vercel Token

1. 登录 [Vercel Dashboard](https://vercel.com/account/tokens)
2. 点击 **Create Token**
3. 输入名称（如 `github-actions`）
4. 复制 Token 并保存到 GitHub Secrets

### 工作流说明

| 工作流 | 触发条件 | 说明 |
|--------|----------|------|
| `deploy-backend.yml` | 推送到 main 分支且修改了 backend/ | 自动部署 Lambda |
| `deploy-frontend.yml` | 推送到 main 分支且修改了 frontend/ | 自动部署 Vercel |
| `deploy-all.yml` | 手动触发 | 可选择部署后端/前端/全部 |

### 手动触发部署

1. 进入 GitHub 仓库 → **Actions**
2. 选择 **Deploy All**
3. 点击 **Run workflow**
4. 选择要部署的组件
5. 点击 **Run workflow**

### 首次部署注意事项

1. **先手动部署一次后端**，获取 API URL
2. 将 API URL 添加到 `NEXT_PUBLIC_API_URL` secret
3. **先在 Vercel 上链接项目**（`npx vercel link`），然后再使用 CI/CD
4. 确保 IAM 用户有足够的权限（参考 `infra/iam-policy.json`）
