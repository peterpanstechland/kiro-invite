'use client'

import { useState, useEffect } from 'react'
import { LogIn, Settings, ArrowRight, Loader2 } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface AuthConfig {
  cognito: {
    enabled: boolean
    userPoolId: string
    clientId: string
    region: string
    domain: string
  }
  passwordAuth: boolean
}

export default function LoginPage() {
  const [authConfig, setAuthConfig] = useState<AuthConfig | null>(null)
  
  // SSO 配置
  const [ssoUrl, setSsoUrl] = useState('')
  const [identityStoreId, setIdentityStoreId] = useState('')
  
  const [error, setError] = useState('')
  const [loadingConfig, setLoadingConfig] = useState(true)

  // 获取认证配置
  useEffect(() => {
    fetch(`${API_URL}/api/admin/auth-config`)
      .then(r => r.json())
      .then(config => {
        setAuthConfig(config)
        setLoadingConfig(false)
      })
      .catch(() => {
        setLoadingConfig(false)
      })
  }, [])

  // 从 SSO URL 提取 Identity Store ID
  const extractStoreId = (url: string) => {
    const match = url.match(/https:\/\/(d-[a-z0-9]+)\.awsapps\.com/)
    return match ? match[1] : ''
  }

  const handleSsoUrlChange = (url: string) => {
    setSsoUrl(url)
    const storeId = extractStoreId(url)
    if (storeId) {
      setIdentityStoreId(storeId)
      setError('')
    }
  }

  // Cognito 登录 - 跳转到 Cognito Hosted UI
  const handleCognitoLogin = () => {
    if (!ssoUrl || !identityStoreId) {
      setError('请输入 SSO URL')
      return
    }

    // 保存 SSO 配置到 localStorage（回调时使用）
    localStorage.setItem('pending_sso_url', ssoUrl)
    localStorage.setItem('pending_identity_store_id', identityStoreId)

    // 构建 Cognito Hosted UI URL（使用 Cognito 原生登录）
    const cognitoDomain = authConfig?.cognito?.domain || 
      `https://kiro-invite-242201290799.auth.us-east-1.amazoncognito.com`
    const clientId = authConfig?.cognito?.clientId
    const redirectUri = encodeURIComponent(`${window.location.origin}/auth/callback`)
    
    // 使用 Cognito 原生登录（不指定 identity_provider）
    const loginUrl = `${cognitoDomain}/login?` +
      `client_id=${clientId}&` +
      `response_type=code&` +
      `scope=email+openid+profile&` +
      `redirect_uri=${redirectUri}`
    
    window.location.href = loginUrl
  }

  if (loadingConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4">
            <span className="text-white font-bold text-2xl">K</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Kiro Invite</h1>
          <p className="text-gray-600 mt-2">企业账号管理系统</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 space-y-5">
          {/* SSO URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              AWS SSO Portal URL
            </label>
            <input
              type="url"
              value={ssoUrl}
              onChange={e => handleSsoUrlChange(e.target.value)}
              placeholder="https://d-xxxxxxxxxx.awsapps.com/start"
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              在 AWS IAM Identity Center → Settings 中找到
            </p>
          </div>

          {identityStoreId && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-green-700">
                <Settings className="w-4 h-4" />
                <span className="text-sm">Identity Store ID: <code className="font-mono">{identityStoreId}</code></span>
              </div>
            </div>
          )}

          {/* 登录说明 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700">
              使用管理员账号登录。首次登录需要修改临时密码。
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <button
            onClick={handleCognitoLogin}
            disabled={!identityStoreId}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LogIn className="w-5 h-5" />
            登录管理后台
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* 帮助信息 */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>需要在 IAM Identity Center 中被分配 "Kiro Invite Admin" 应用权限</p>
        </div>
      </div>
    </div>
  )
}
