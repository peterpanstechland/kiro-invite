# AWS SSO + Cognito SAML 配置指南

## 概述

本指南帮助你配置 AWS IAM Identity Center (SSO) 与 Cognito 的 SAML 集成，实现真正的 SSO 登录。

## 当前配置信息

- **Cognito User Pool ID**: `us-east-1_TJLzUElHy`
- **Cognito Domain**: `https://kiro-invite-242201290799.auth.us-east-1.amazoncognito.com`
- **Identity Store ID**: `d-9067c1f114`
- **IAM Identity Center Instance**: `ssoins-7223baaee4513618`

## 步骤 1: 在 IAM Identity Center 创建 SAML 应用

1. 登录 AWS Console → IAM Identity Center
2. 左侧菜单点击 **Applications**
3. 点击 **Add application**
4. 选择 **I have an application I want to set up** → **SAML 2.0**
5. 点击 **Next**

### 配置应用元数据

- **Display name**: `Kiro Invite Admin`
- **Description**: `Kiro Invite 管理系统`

### 配置 SAML (重要!)

- **Application ACS URL**: 
  ```
  https://kiro-invite-242201290799.auth.us-east-1.amazoncognito.com/saml2/idpresponse
  ```

- **Application SAML audience**:
  ```
  urn:amazon:cognito:sp:us-east-1_TJLzUElHy
  ```

6. 点击 **Submit**

## 步骤 2: 配置 SAML Attribute Mapping

在创建的应用中：

1. 点击 **Actions** → **Edit attribute mappings**
2. 添加以下映射：

| User attribute in the application | Maps to this string value or user attribute |
|-----------------------------------|---------------------------------------------|
| `Subject` | `${user:email}` |
| `email` | `${user:email}` |

3. 点击 **Save changes**

## 步骤 3: 下载 SAML Metadata

1. 在 IAM Identity Center → Settings
2. 找到 **Identity source** 部分
3. 点击 **IAM Identity Center SAML metadata file** 的 **Download** 链接
4. 或者直接访问: `https://portal.sso.us-east-1.amazonaws.com/saml/metadata/ssoins-7223baaee4513618`
5. 保存 XML 文件

## 步骤 4: 在 Cognito 添加 SAML Identity Provider

1. 登录 AWS Console → Cognito → User Pools
2. 选择 `kiro-invite-users` (ID: `us-east-1_TJLzUElHy`)
3. 点击 **Sign-in experience** 标签
4. 在 **Federated identity provider sign-in** 部分，点击 **Add identity provider**
5. 选择 **SAML**

### 配置 SAML Provider

- **Provider name**: `AwsSSO` (必须是这个名字!)
- **Metadata document**: 上传步骤 3 下载的 XML 文件
- **Identifiers** (可选): 留空
- **SAML attribute mapping**:
  - 点击 **Add attribute**
  - User pool attribute: `email`
  - SAML attribute: `email`

6. 点击 **Add identity provider**

## 步骤 5: 更新 Cognito App Client

1. 在 Cognito User Pool 页面，点击 **App integration** 标签
2. 滚动到 **App clients and analytics**，点击 `kiro-invite-web`
3. 在 **Hosted UI** 部分，点击 **Edit**
4. 在 **Identity providers** 中，勾选 **AwsSSO** (和 COGNITO)
5. 点击 **Save changes**

## 步骤 6: 在 IAM Identity Center 分配用户

1. 回到 IAM Identity Center → Applications
2. 找到 `Kiro Invite Admin` 应用
3. 点击应用名称进入详情
4. 点击 **Assign users and groups**
5. 选择要授权的用户（如 `peterpanadmin`）
6. 点击 **Assign**

## 步骤 7: 部署更新

```bash
cd backend
sam build
sam deploy --no-confirm-changeset
```

```bash
cd frontend
npx vercel --prod
```

## 步骤 8: 测试登录

1. 访问 https://kiro-invite.vercel.app/login
2. 输入 SSO URL: `https://d-9067c1f114.awsapps.com/start`
3. 点击 "使用 AWS SSO 登录"
4. 应该跳转到 AWS SSO 登录页面
5. 使用 IAM Identity Center 中的用户登录
6. 登录成功后自动回调到应用

## 故障排除

### 错误: "Bad input" 或 400 错误

这通常是因为 SAML metadata 配置不正确：

1. 确保从 IAM Identity Center **Settings** 页面下载 metadata（不是从应用页面）
2. 在 Cognito 中删除现有的 AwsSSO provider
3. 重新创建，上传正确的 metadata 文件

### 错误: "Invalid identity provider"

- 确保 Cognito App Client 中启用了 AwsSSO provider
- 确保 provider name 完全匹配 `AwsSSO`（区分大小写）

### 错误: "Invalid SAML response"

- 检查 ACS URL 是否正确（必须是 Cognito domain + `/saml2/idpresponse`）
- 检查 SAML audience 是否正确（必须是 `urn:amazon:cognito:sp:` + User Pool ID）

### 错误: "User not assigned"

- 在 IAM Identity Center 中为用户分配 "Kiro Invite Admin" 应用访问权限

### 登录后没有 email

- 检查 SAML attribute mapping 是否正确配置了 email 属性

## 认证流程说明

```
用户 → 前端登录页 → Cognito Hosted UI (identity_provider=AwsSSO)
                          ↓
                    IAM Identity Center (SAML)
                          ↓
                    用户输入 SSO 凭证
                          ↓
                    SAML Response → Cognito
                          ↓
                    Cognito 返回 JWT Token
                          ↓
                    前端保存 Token，访问 API
                          ↓
                    API 验证 JWT Token
```

这样只有在 IAM Identity Center 中被分配了 "Kiro Invite Admin" 应用权限的用户才能登录管理后台。
