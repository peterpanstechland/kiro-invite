'use client'

import { Locale } from '@/lib/i18n'

interface Props {
  locale: Locale
  onChange: (locale: Locale) => void
}

export default function LanguageSwitcher({ locale, onChange }: Props) {
  return (
    <div className="flex items-center gap-1 bg-white/80 backdrop-blur rounded-full px-1 py-1 shadow-sm border">
      <button
        onClick={() => onChange('zh')}
        className={`px-3 py-1 rounded-full text-sm font-medium transition ${
          locale === 'zh' 
            ? 'bg-primary-600 text-white' 
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        中文
      </button>
      <button
        onClick={() => onChange('en')}
        className={`px-3 py-1 rounded-full text-sm font-medium transition ${
          locale === 'en' 
            ? 'bg-primary-600 text-white' 
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        EN
      </button>
    </div>
  )
}
