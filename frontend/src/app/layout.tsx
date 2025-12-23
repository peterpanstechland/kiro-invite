import './globals.css'

export const metadata = {
  title: 'Kiro Invite',
  description: '学生账号邀请系统',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body>{children}</body>
    </html>
  )
}
