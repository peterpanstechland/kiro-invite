'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Copy, Trash2, Users, Link, Check, LogOut, Loader2, Settings, Download } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

interface Invite {
  token: string
  status: string
  tier: string
  entitlement_days: number
  expires_at: string | null
  claimed_email: string | null
  claim_url: string
}

interface User {
  user_id: string
  username: string
  email: string
  status: string
  tier: string
  expires_at: string | null
}

interface SSOConfig {
  ssoUrl: string
  identityStoreId: string
}

export default function AdminPage() {
  const router = useRouter()
  
  const [config, setConfig] = useState<SSOConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'invites' | 'users'>('invites')
  const [invites, setInvites] = useState<Invite[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  
  // 创建邀请表单
  const [count, setCount] = useState(5)
  const [tier, setTier] = useState('Pro')
  const [expiresDate, setExpiresDate] = useState(() => {
    // 默认90天后
    const date = new Date()
    date.setDate(date.getDate() + 90)
    return date.toISOString().split('T')[0]
  })

  // 检查登录状态
  useEffect(() => {
    const checkAuth = async () => {
      const ssoUrl = localStorage.getItem('sso_url')
      const identityStoreId = localStorage.getItem('identity_store_id')
      const authType = localStorage.getItem('auth_type')
      const cognitoToken = localStorage.getItem('cognito_id_token')
      
      // 必须有 SSO URL 和 Identity Store ID
      if (!ssoUrl || !identityStoreId) {
        router.push('/login')
        return
      }
      
      // 必须有 Cognito token
      if (authType !== 'cognito' || !cognitoToken) {
        router.push('/login')
        return
      }
      
      // 验证 token 是否有效（检查过期）
      try {
        const payload = JSON.parse(atob(cognitoToken.split('.')[1]))
        const exp = payload.exp * 1000 // 转换为毫秒
        if (Date.now() > exp) {
          // Token 已过期，清除并重新登录
          localStorage.clear()
          router.push('/login')
          return
        }
      } catch (e) {
        // Token 解析失败
        localStorage.clear()
        router.push('/login')
        return
      }
      
      setConfig({ ssoUrl, identityStoreId })
      setLoading(false)
    }
    
    checkAuth()
  }, [router])

  // 获取请求头
  const getHeaders = () => {
    const token = localStorage.getItem('cognito_id_token')
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Identity-Store-Id': config?.identityStoreId || '',
      'X-SSO-Url': config?.ssoUrl || ''
    }
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    
    return headers
  }

  const loadInvites = async () => {
    if (!config) return
    const res = await fetch(`${API_URL}/api/invites/list?store_id=${config.identityStoreId}`, {
      headers: getHeaders()
    })
    const data = await res.json()
    setInvites(data)
  }

  const loadUsers = async () => {
    if (!config) return
    const res = await fetch(`${API_URL}/api/users/list?store_id=${config.identityStoreId}`, {
      headers: getHeaders()
    })
    const data = await res.json()
    setUsers(data)
  }

  useEffect(() => {
    if (config) {
      loadInvites()
      loadUsers()
    }
  }, [config])

  const createInvites = async () => {
    if (!config) return
    setCreating(true)
    
    await fetch(`${API_URL}/api/invites/create`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ 
        count, 
        tier, 
        expires_date: expiresDate,  // 直接传日期 YYYY-MM-DD
        identity_store_id: config.identityStoreId,
        sso_url: config.ssoUrl
      })
    })
    await loadInvites()
    setCreating(false)
  }

  const revokeInvite = async (token: string) => {
    await fetch(`${API_URL}/api/invites/${token}`, { 
      method: 'DELETE',
      headers: getHeaders()
    })
    await loadInvites()
  }

  const deleteUser = async (userId: string) => {
    if (!confirm('确定删除此用户？')) return
    await fetch(`${API_URL}/api/users/${userId}?store_id=${config?.identityStoreId}`, { 
      method: 'DELETE',
      headers: getHeaders()
    })
    await loadUsers()
  }

  const copyUrl = (url: string, token: string) => {
    navigator.clipboard.writeText(url)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  // 批量导出邀请链接
  const exportInvites = (format: 'txt' | 'csv' | 'json') => {
    const pendingInvites = invites.filter(inv => inv.status === 'PENDING' && !isExpired(inv.expires_at))
    
    if (pendingInvites.length === 0) {
      alert('没有待认领的邀请链接可导出')
      return
    }

    let content = ''
    let filename = ''
    let mimeType = ''

    if (format === 'txt') {
      // 纯文本格式 - 每行一个链接
      content = pendingInvites.map(inv => inv.claim_url).join('\n')
      filename = `invites_${new Date().toISOString().split('T')[0]}.txt`
      mimeType = 'text/plain'
    } else if (format === 'csv') {
      // CSV 格式
      const headers = ['链接', '等级', '过期时间']
      const rows = pendingInvites.map(inv => [
        inv.claim_url,
        inv.tier,
        inv.expires_at || ''
      ])
      content = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
      filename = `invites_${new Date().toISOString().split('T')[0]}.csv`
      mimeType = 'text/csv'
    } else {
      // JSON 格式
      content = JSON.stringify(pendingInvites.map(inv => ({
        url: inv.claim_url,
        token: inv.token,
        tier: inv.tier,
        expires_at: inv.expires_at
      })), null, 2)
      filename = `invites_${new Date().toISOString().split('T')[0]}.json`
      mimeType = 'application/json'
    }

    // 创建下载
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // 复制所有待认领链接
  const copyAllPendingUrls = () => {
    const pendingInvites = invites.filter(inv => inv.status === 'PENDING' && !isExpired(inv.expires_at))
    if (pendingInvites.length === 0) {
      alert('没有待认领的邀请链接')
      return
    }
    const urls = pendingInvites.map(inv => inv.claim_url).join('\n')
    navigator.clipboard.writeText(urls)
    alert(`已复制 ${pendingInvites.length} 个链接到剪贴板`)
  }

  const formatDate = (d: string | null) => {
    if (!d) return '-'
    const date = new Date(d)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // 检查邀请是否已过期
  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  // 获取显示状态（考虑过期）
  const getDisplayStatus = (inv: Invite) => {
    if (inv.status === 'PENDING' && isExpired(inv.expires_at)) {
      return 'EXPIRED'
    }
    return inv.status
  }

  const handleLogout = () => {
    localStorage.removeItem('sso_url')
    localStorage.removeItem('identity_store_id')
    localStorage.removeItem('admin_password')
    localStorage.removeItem('auth_type')
    localStorage.removeItem('cognito_id_token')
    localStorage.removeItem('cognito_access_token')
    localStorage.removeItem('cognito_refresh_token')
    localStorage.removeItem('user_email')
    localStorage.removeItem('is_admin')
    router.push('/login')
  }

  // 加载中
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Kiro Invite 管理</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
              <Settings className="w-4 h-4" />
              <code>{config?.identityStoreId}</code>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <LogOut className="w-4 h-4" />
              退出
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setTab('invites')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              tab === 'invites' ? 'bg-primary-600 text-white' : 'bg-white text-gray-700'
            }`}
          >
            <Link className="w-4 h-4" />
            邀请链接
          </button>
          <button
            onClick={() => setTab('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              tab === 'users' ? 'bg-primary-600 text-white' : 'bg-white text-gray-700'
            }`}
          >
            <Users className="w-4 h-4" />
            用户列表
          </button>
        </div>

        {/* Invites Tab */}
        {tab === 'invites' && (
          <div className="space-y-6">
            {/* Create Form */}
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h2 className="font-medium mb-4">创建邀请链接</h2>
              <div className="flex gap-4 items-end flex-wrap">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">数量</label>
                  <input
                    type="number"
                    value={count}
                    onChange={e => setCount(Number(e.target.value))}
                    min={1}
                    max={100}
                    className="w-20 px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">等级</label>
                  <select
                    value={tier}
                    onChange={e => setTier(e.target.value)}
                    className="px-3 py-2 border rounded-lg"
                  >
                    <option value="Free">Free</option>
                    <option value="Pro">Pro</option>
                    <option value="Pro+">Pro+</option>
                    <option value="Power">Power</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">到期日期</label>
                  <input
                    type="date"
                    value={expiresDate}
                    onChange={e => setExpiresDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="px-3 py-2 border rounded-lg"
                  />
                </div>
                <button
                  onClick={createInvites}
                  disabled={creating}
                  className="btn btn-primary flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  创建
                </button>
              </div>
            </div>

            {/* Invites List */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              {/* 导出工具栏 */}
              {invites.filter(inv => inv.status === 'PENDING' && !isExpired(inv.expires_at)).length > 0 && (
                <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    待认领: {invites.filter(inv => inv.status === 'PENDING' && !isExpired(inv.expires_at)).length} 个
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={copyAllPendingUrls}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white border rounded-lg hover:bg-gray-50"
                    >
                      <Copy className="w-4 h-4" />
                      复制全部
                    </button>
                    <div className="relative group">
                      <button className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white border rounded-lg hover:bg-gray-50">
                        <Download className="w-4 h-4" />
                        导出
                      </button>
                      <div className="absolute right-0 mt-1 w-32 bg-white border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                        <button
                          onClick={() => exportInvites('txt')}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 rounded-t-lg"
                        >
                          导出 TXT
                        </button>
                        <button
                          onClick={() => exportInvites('csv')}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                        >
                          导出 CSV
                        </button>
                        <button
                          onClick={() => exportInvites('json')}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 rounded-b-lg"
                        >
                          导出 JSON
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">链接</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">状态</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">等级</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">认领邮箱</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">过期时间</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invites.map(inv => (
                    <tr key={inv.token}>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => copyUrl(inv.claim_url, inv.token)}
                          className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
                        >
                          {copiedToken === inv.token ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                          <span className="font-mono">{inv.token.slice(0, 8)}...</span>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          const displayStatus = getDisplayStatus(inv)
                          return (
                            <span className={`px-2 py-1 rounded text-xs ${
                              displayStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                              displayStatus === 'CLAIMED' ? 'bg-green-100 text-green-700' :
                              displayStatus === 'EXPIRED' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {displayStatus === 'PENDING' ? '待认领' :
                               displayStatus === 'CLAIMED' ? '已认领' :
                               displayStatus === 'EXPIRED' ? '已过期' :
                               displayStatus === 'REVOKED' ? '已撤销' : displayStatus}
                            </span>
                          )
                        })()}
                      </td>
                      <td className="px-4 py-3 text-sm">{inv.tier}</td>
                      <td className="px-4 py-3 text-sm">{inv.claimed_email || '-'}</td>
                      <td className="px-4 py-3 text-sm">{formatDate(inv.expires_at)}</td>
                      <td className="px-4 py-3">
                        {inv.status === 'PENDING' && (
                          <button
                            onClick={() => revokeInvite(inv.token)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {invites.length === 0 && (
                <p className="text-center py-8 text-gray-500">暂无邀请链接</p>
              )}
            </div>
          </div>
        )}

        {/* Users Tab */}
        {tab === 'users' && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">用户名</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">邮箱</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">状态</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">等级</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">到期时间</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map(user => (
                  <tr key={user.user_id}>
                    <td className="px-4 py-3 font-mono text-sm">{user.username}</td>
                    <td className="px-4 py-3 text-sm">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        user.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {user.status === 'ACTIVE' ? '正常' : user.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{user.tier}</td>
                    <td className="px-4 py-3 text-sm">{formatDate(user.expires_at)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => deleteUser(user.user_id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && (
              <p className="text-center py-8 text-gray-500">暂无用户</p>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
