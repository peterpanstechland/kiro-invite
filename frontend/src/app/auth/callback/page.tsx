'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

function CallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code')
      const errorParam = searchParams.get('error')
      const errorDescription = searchParams.get('error_description')

      if (errorParam) {
        setError(errorDescription || errorParam)
        setStatus('error')
        return
      }

      if (!code) {
        setError('未收到授权码')
        setStatus('error')
        return
      }

      try {
        // 获取 Cognito 配置
        const configRes = await fetch(`${API_URL}/api/admin/auth-config`)
        const config = await configRes.json()
        
        const cognitoDomain = `https://kiro-invite-242201290799.auth.us-east-1.amazoncognito.com`
        const clientId = config.cognito?.clientId
        const redirectUri = `${window.location.origin}/auth/callback`

        // 用 code 换取 token
        const tokenRes = await fetch(`${cognitoDomain}/oauth2/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: clientId,
            code: code,
            redirect_uri: redirectUri
          })
        })

        if (!tokenRes.ok) {
          const errData = await tokenRes.json()
          throw new Error(errData.error_description || 'Token 交换失败')
        }

        const tokens = await tokenRes.json()
        
        // 保存 tokens
        localStorage.setItem('cognito_id_token', tokens.id_token)
        localStorage.setItem('cognito_access_token', tokens.access_token)
        localStorage.setItem('cognito_refresh_token', tokens.refresh_token || '')
        localStorage.setItem('auth_type', 'cognito')
        localStorage.setItem('is_admin', 'true')

        // 恢复之前保存的 SSO 配置
        const pendingSsoUrl = localStorage.getItem('pending_sso_url')
        const pendingStoreId = localStorage.getItem('pending_identity_store_id')
        
        if (pendingSsoUrl && pendingStoreId) {
          localStorage.setItem('sso_url', pendingSsoUrl)
          localStorage.setItem('identity_store_id', pendingStoreId)
          localStorage.removeItem('pending_sso_url')
          localStorage.removeItem('pending_identity_store_id')
        }

        // 解析 ID token 获取用户信息
        try {
          const payload = JSON.parse(atob(tokens.id_token.split('.')[1]))
          localStorage.setItem('user_email', payload.email || '')
        } catch (e) {
          // ignore
        }

        setStatus('success')
        
        // 跳转到主页
        setTimeout(() => {
          router.push('/')
        }, 1500)

      } catch (e: any) {
        setError(e.message || '登录失败')
        setStatus('error')
      }
    }

    handleCallback()
  }, [searchParams, router])

  return (
    <>
      {status === 'loading' && (
        <>
          <Loader2 className="w-12 h-12 animate-spin text-primary-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">正在验证身份...</h2>
          <p className="text-gray-500 mt-2">请稍候</p>
        </>
      )}

      {status === 'success' && (
        <>
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">登录成功！</h2>
          <p className="text-gray-500 mt-2">正在跳转...</p>
        </>
      )}

      {status === 'error' && (
        <>
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">登录失败</h2>
          <p className="text-red-600 mt-2">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            返回登录
          </button>
        </>
      )}
    </>
  )
}

export default function AuthCallbackPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <Suspense fallback={
          <>
            <Loader2 className="w-12 h-12 animate-spin text-primary-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900">加载中...</h2>
          </>
        }>
          <CallbackContent />
        </Suspense>
      </div>
    </div>
  )
}
