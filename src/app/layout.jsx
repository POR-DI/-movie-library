import '../index.css'
import Providers from './providers'
export const metadata = {
  title: 'CineShelf — Your stories, your shelf.',
  description: 'CineShelf — ห้องสมุดส่วนตัวสำหรับหนังเรื่องโปรดของคุณ',
  icons: { icon: '/favicon.svg' },
}
export const viewport = { themeColor: '#101112' }
export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
