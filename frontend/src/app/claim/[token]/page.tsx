'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Mail, User, Loader2, PartyPopper, XCircle, Gift } from 'lucide-react'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { Locale, getTranslation } from '@/lib/i18n'

type State = 'loading' | 'form' | 'submitting' | 'success' | 'error'

export default function ClaimPage() {
  const params = useParams()
  const token = params.token as string
  
  const [locale, setLocale] = useState<Locale>('zh')
  const t = getTranslation(locale)
  
  const [state, setState] = useState<State>('loading')
  const [info, setInfo] = useState<{ tier?: string; entitlement_days?: number; expires_at?: string; created_at?: string } | null>(null)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || ''

  // 检测浏览器语言
  useEffect(() => {
    const browserLang = navigator.language.toLowerCase()
    if (browserLang.startsWith('en')) {
      setLocale('en')
    }
  }, [])

  useEffect(() => {
    if (!token) return
    fetch(`${apiUrl}/api/invites/info/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.valid) {
          setInfo(data)
          setState('form')
        } else {
          setError(data.error || t.invalidLink)
          setState('error')
        }
      })
      .catch(() => {
        setError(t.loadFailed)
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
        setError(data.error || t.claimFailed)
        setState('error')
      }
    } catch {
      setError(t.requestFailed)
      setState('error')
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US', { 
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      {/* 语言切换器 - 固定在右上角 */}
      <div className="fixed top-4 right-4 z-50">
        <LanguageSwitcher locale={locale} onChange={setLocale} />
      </div>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4">
            <span className="text-white font-bold text-2xl">K</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{t.pageTitle}</h1>
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
                  <p className="text-sm font-medium text-primary-800">{t.inviteReceived}</p>
                  <p className="text-sm text-primary-600">
                    {t.tier}: {info.tier}
                  </p>
                  {info.created_at && (
                    <p className="text-xs text-primary-500 mt-1">
                      {t.createdAt}: {formatDate(info.created_at)}
                    </p>
                  )}
                  {info.expires_at && (
                    <p className="text-xs text-primary-500">
                      {t.expiresAt}: {formatDate(info.expires_at)}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.email} <span className="text-red-500">{t.emailRequired}</span>
                </label>
                <div className="relative">
                  <Mail className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder={t.emailPlaceholder}
                    className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{t.emailHint}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.name} <span className="text-gray-400">{t.nameOptional}</span>
                </label>
                <div className="relative">
                  <User className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder={t.namePlaceholder}
                    className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <button type="submit" className="w-full btn btn-primary py-3 text-lg">
                {t.claimAccount}
              </button>
            </form>
          )}

          {state === 'submitting' && (
            <div className="text-center py-8">
              <Loader2 className="w-10 h-10 animate-spin text-primary-600 mx-auto mb-4" />
              <p className="text-gray-600">{t.creatingAccount}</p>
            </div>
          )}

          {state === 'success' && result && (
            <div className="space-y-5">
              <div className="text-center">
                <PartyPopper className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <h2 className="text-xl font-semibold">{t.successTitle}</h2>
                <p className="text-gray-500 mt-1">{t.successSubtitle}</p>
              </div>

              <div className="bg-green-50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">{t.username}</span>
                  <span className="font-mono font-semibold text-green-700">{result.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t.email}</span>
                  <span>{result.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t.tier}</span>
                  <span className="font-medium">{result.tier}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t.validUntil}</span>
                  <span>{result.expires_at ? formatDate(result.expires_at) : '-'}</span>
                </div>
              </div>

              {/* 重要提示 */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm font-bold text-red-700 mb-1">{t.importantTitle}</p>
                <p className="text-xs text-red-600">{t.importantDesc}</p>
              </div>

              {/* 详细步骤 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-bold text-blue-800 mb-3">{t.stepsTitle}</p>
                <ol className="text-sm text-blue-700 space-y-3">
                  <li className="flex gap-2">
                    <span className="bg-blue-200 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                    <span>{t.step1}</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="bg-blue-200 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                    <div>
                      <span>{t.step2}</span>
                      <div className="mt-1">
                        <span>{t.step3}</span>
                        <code className="bg-blue-100 px-2 py-0.5 rounded font-mono font-bold text-blue-900 ml-1">{result.username}</code>
                        <button 
                          onClick={() => {navigator.clipboard.writeText(result.username); alert(t.copied)}}
                          className="ml-2 text-xs text-blue-600 underline"
                        >
                          {t.clickToCopy}
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="flex gap-2">
                    <span className="bg-blue-200 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                    <span>{t.step4.replace('{email}', result.email)}</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="bg-blue-200 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
                    <span>{t.step5}</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="bg-blue-200 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0">5</span>
                    <span>{t.step6}</span>
                  </li>
                </ol>
              </div>

              {/* 联系管理员 */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-sm font-bold text-orange-800 mb-2">{t.contactAdminTitle}</p>
                <p className="text-sm text-orange-700">{t.contactAdminDesc}</p>
                <p className="text-xs text-orange-600 mt-2">{t.contactAdminNote}</p>
              </div>

              {/* 如何使用 Kiro */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm font-bold text-gray-800 mb-3">{t.howToUseTitle}</p>
                <ol className="text-sm text-gray-600 space-y-2">
                  <li className="flex gap-2">
                    <span className="text-gray-400">1.</span>
                    <span>{t.howToUse1} <a href="https://kiro.dev" target="_blank" className="text-primary-600 underline">Kiro IDE</a></span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-gray-400">2.</span>
                    <span>{t.howToUse2}</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-gray-400">3.</span>
                    <div>
                      <span>{t.howToUse3}</span>
                      <code className="bg-gray-100 px-1 rounded text-xs">{result.sso_url || 'https://d-9067c1f114.awsapps.com/start'}</code>
                    </div>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-gray-400">4.</span>
                    <span>{t.howToUse4}</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-gray-400">5.</span>
                    <span>{t.howToUse5}</span>
                  </li>
                </ol>
              </div>

              <a
                href={result.sso_url || 'https://d-9067c1f114.awsapps.com/start'}
                target="_blank"
                className="block w-full bg-primary-600 hover:bg-primary-700 text-white py-4 text-center rounded-lg font-semibold text-lg transition"
              >
                {t.goToSSO}
              </a>
              
              <p className="text-xs text-gray-400 text-center">
                {t.ssoAddress}: {result.sso_url || 'https://d-9067c1f114.awsapps.com/start'}
              </p>

              {/* 常见问题 */}
              <div className="border-t pt-4 mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">{t.faqTitle}</p>
                <details className="text-sm text-gray-600 mb-2">
                  <summary className="cursor-pointer hover:text-gray-800">{t.faq1Q}</summary>
                  <p className="mt-1 ml-4 text-gray-500">{t.faq1A}</p>
                </details>
                <details className="text-sm text-gray-600 mb-2">
                  <summary className="cursor-pointer hover:text-gray-800">{t.faq2Q}</summary>
                  <p className="mt-1 ml-4 text-gray-500">{t.faq2A}<code className="bg-gray-100 px-1 rounded">{result.username}</code></p>
                </details>
                <details className="text-sm text-gray-600">
                  <summary className="cursor-pointer hover:text-gray-800">{t.faq3Q}</summary>
                  <p className="mt-1 ml-4 text-gray-500">{t.faq3A}</p>
                </details>
              </div>
            </div>
          )}

          {state === 'error' && (
            <div className="text-center py-6">
              <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <h2 className="text-xl font-semibold mb-2">{t.errorTitle}</h2>
              <p className="text-red-600">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
