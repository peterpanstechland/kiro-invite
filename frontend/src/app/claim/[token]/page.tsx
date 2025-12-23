'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Mail, User, Loader2, PartyPopper, XCircle, Gift } from 'lucide-react'

type State = 'loading' | 'form' | 'submitting' | 'success' | 'error'

export default function ClaimPage() {
  const params = useParams()
  const token = params.token as string
  
  const [state, setState] = useState<State>('loading')
  const [info, setInfo] = useState<{ tier?: string; entitlement_days?: number } | null>(null)
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
                    等级: {info.tier} · 有效期: {info.entitlement_days} 天
                  </p>
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
                <h2 className="text-xl font-semibold">认领成功！</h2>
              </div>

              <div className="bg-green-50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">用户名</span>
                  <span className="font-mono">{result.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">邮箱</span>
                  <span>{result.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">等级</span>
                  <span>{result.tier}</span>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm font-medium text-amber-800 mb-2">🔑 设置密码步骤：</p>
                <ol className="text-sm text-amber-700 list-decimal list-inside space-y-2">
                  <li>点击下方按钮前往 SSO 登录页面</li>
                  <li>点击 <strong>"Forgot password?"</strong> 链接</li>
                  <li>输入您的用户名: <code className="bg-amber-100 px-1 rounded">{result.username}</code></li>
                  <li>检查邮箱获取密码重置链接</li>
                  <li>设置新密码后即可登录 Kiro</li>
                </ol>
              </div>

              <a
                href="https://d-9067c1f114.awsapps.com/start"
                target="_blank"
                className="block w-full btn btn-primary py-3 text-center"
              >
                前往 SSO 登录页面 →
              </a>
              
              <p className="text-xs text-gray-500 text-center">
                SSO 地址: https://d-9067c1f114.awsapps.com/start
              </p>
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
