'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Mail, User, Loader2, PartyPopper, XCircle, Gift } from 'lucide-react'

type State = 'loading' | 'form' | 'submitting' | 'success' | 'error'

export default function ClaimPage() {
  const params = useParams()
  const token = params.token as string
  
  const [state, setState] = useState<State>('loading')
  const [info, setInfo] = useState<{ tier?: string; entitlement_days?: number; expires_at?: string; created_at?: string } | null>(null)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || ''

  useEffect(() => {
    if (!token) return
    fetch(`${apiUrl}/api/invites/info/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.valid) {
          setInfo(data)
          setState('form')
        } else {
          setError(data.error || '无效链接')
          setState('error')
        }
      })
      .catch(() => {
        setError('加载失败')
        setState('error')
      })
  }, [token, apiUrl])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    
    setState('submitting')
    try {
      const res = await fetch(`${apiUrl}/api/invites/claim/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, display_name: name || undefined })
      })
      const data = await res.json()
      
      if (data.success) {
        setResult(data)
        setState('success')
      } else {
        setError(data.error || '认领失败')
        setState('error')
      }
    } catch {
      setError('请求失败')
      setState('error')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4">
            <span className="text-white font-bold text-2xl">K</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Kiro 账号认领</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6">
          {state === 'loading' && (
            <div className="text-center py-8">
              <Loader2 className="w-10 h-10 animate-spin text-primary-600 mx-auto" />
            </div>
          )}

          {state === 'form' && info && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="bg-primary-50 rounded-lg p-4 flex gap-3">
                <Gift className="w-5 h-5 text-primary-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-primary-800">您收到了 Kiro 账号邀请</p>
                  <p className="text-sm text-primary-600">
                    等级: {info.tier}
                  </p>
                  {info.created_at && (
                    <p className="text-xs text-primary-500 mt-1">
                      创建时间: {new Date(info.created_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
                    </p>
                  )}
                  {info.expires_at && (
                    <p className="text-xs text-primary-500">
                      有效期至: {new Date(info.expires_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  邮箱 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">用于接收密码重置邮件（通过"忘记密码"功能）</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  姓名 <span className="text-gray-400">(可选)</span>
                </label>
                <div className="relative">
                  <User className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="您的姓名"
                    className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <button type="submit" className="w-full btn btn-primary py-3 text-lg">
                认领账号
              </button>
            </form>
          )}

          {state === 'submitting' && (
            <div className="text-center py-8">
              <Loader2 className="w-10 h-10 animate-spin text-primary-600 mx-auto mb-4" />
              <p className="text-gray-600">正在创建账号...</p>
            </div>
          )}

          {state === 'success' && result && (
            <div className="space-y-5">
              <div className="text-center">
                <PartyPopper className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <h2 className="text-xl font-semibold">🎉 认领成功！</h2>
                <p className="text-gray-500 mt-1">您的 Kiro 账号已创建</p>
              </div>

              <div className="bg-green-50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">用户名</span>
                  <span className="font-mono font-semibold text-green-700">{result.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">邮箱</span>
                  <span>{result.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">等级</span>
                  <span className="font-medium">{result.tier}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">有效期至</span>
                  <span>{result.expires_at ? new Date(result.expires_at).toLocaleDateString('zh-CN') : '-'}</span>
                </div>
              </div>

              {/* 重要提示 */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm font-bold text-red-700 mb-1">⚠️ 重要：请立即设置密码！</p>
                <p className="text-xs text-red-600">账号创建后没有初始密码，您需要通过"忘记密码"功能来设置密码。</p>
              </div>

              {/* 详细步骤 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-bold text-blue-800 mb-3">📝 设置密码步骤（请仔细阅读）：</p>
                <ol className="text-sm text-blue-700 space-y-3">
                  <li className="flex gap-2">
                    <span className="bg-blue-200 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                    <span>点击下方 <strong>"前往 SSO 登录页面"</strong> 按钮</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="bg-blue-200 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                    <span>在登录页面，<strong>不要输入密码</strong>，直接点击 <strong>"Forgot password?"</strong> 链接</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="bg-blue-200 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                    <div>
                      <span>输入您的用户名：</span>
                      <code className="bg-blue-100 px-2 py-0.5 rounded font-mono font-bold text-blue-900 ml-1">{result.username}</code>
                      <button 
                        onClick={() => {navigator.clipboard.writeText(result.username); alert('已复制用户名！')}}
                        className="ml-2 text-xs text-blue-600 underline"
                      >
                        点击复制
                      </button>
                    </div>
                  </li>
                  <li className="flex gap-2">
                    <span className="bg-blue-200 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
                    <span>检查您的邮箱 <strong>{result.email}</strong>，点击密码重置链接</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="bg-blue-200 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0">5</span>
                    <span>设置一个新密码（至少8位，包含大小写字母和数字）</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="bg-blue-200 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0">6</span>
                    <span>密码设置成功后，返回登录页面用新密码登录</span>
                  </li>
                </ol>
              </div>

              {/* 如何使用 Kiro */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm font-bold text-gray-800 mb-3">🚀 如何使用 Kiro IDE：</p>
                <ol className="text-sm text-gray-600 space-y-2">
                  <li className="flex gap-2">
                    <span className="text-gray-400">1.</span>
                    <span>下载并安装 <a href="https://kiro.dev" target="_blank" className="text-primary-600 underline">Kiro IDE</a></span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-gray-400">2.</span>
                    <span>打开 Kiro，选择 <strong>"Sign in with IAM Identity Center"</strong></span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-gray-400">3.</span>
                    <div>
                      <span>输入 SSO 地址：</span>
                      <code className="bg-gray-100 px-1 rounded text-xs">{result.sso_url || 'https://d-9067c1f114.awsapps.com/start'}</code>
                    </div>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-gray-400">4.</span>
                    <span>使用您的用户名和刚设置的密码登录</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-gray-400">5.</span>
                    <span>开始使用 Kiro 进行 AI 辅助编程！</span>
                  </li>
                </ol>
              </div>

              <a
                href={result.sso_url || 'https://d-9067c1f114.awsapps.com/start'}
                target="_blank"
                className="block w-full bg-primary-600 hover:bg-primary-700 text-white py-4 text-center rounded-lg font-semibold text-lg transition"
              >
                前往 SSO 登录页面 →
              </a>
              
              <p className="text-xs text-gray-400 text-center">
                SSO 地址: {result.sso_url || 'https://d-9067c1f114.awsapps.com/start'}
              </p>

              {/* 常见问题 */}
              <div className="border-t pt-4 mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">❓ 常见问题：</p>
                <details className="text-sm text-gray-600 mb-2">
                  <summary className="cursor-pointer hover:text-gray-800">收不到密码重置邮件？</summary>
                  <p className="mt-1 ml-4 text-gray-500">请检查垃圾邮件文件夹，或等待几分钟后重试。邮件来自 AWS (no-reply@login.awsapps.com)。</p>
                </details>
                <details className="text-sm text-gray-600 mb-2">
                  <summary className="cursor-pointer hover:text-gray-800">忘记用户名了？</summary>
                  <p className="mt-1 ml-4 text-gray-500">您的用户名是：<code className="bg-gray-100 px-1 rounded">{result.username}</code></p>
                </details>
                <details className="text-sm text-gray-600">
                  <summary className="cursor-pointer hover:text-gray-800">密码要求是什么？</summary>
                  <p className="mt-1 ml-4 text-gray-500">至少8个字符，必须包含大写字母、小写字母和数字。</p>
                </details>
              </div>
            </div>
          )}

          {state === 'error' && (
            <div className="text-center py-6">
              <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <h2 className="text-xl font-semibold mb-2">无法认领</h2>
              <p className="text-red-600">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
