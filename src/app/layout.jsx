import { Suspense } from 'react'
import localFont from 'next/font/local'
import Providers from './providers'
import '../index.css'
const gotham = localFont({
  src: [
    { path: './fonts/GothamBook.ttf', weight: '400', style: 'normal' },
    { path: './fonts/GothamMedium.ttf', weight: '500', style: 'normal' },
    { path: './fonts/GothamBold.ttf', weight: '700', style: 'normal' },
    { path: './fonts/Gotham-Black.otf', weight: '800', style: 'normal' },
  ],
  variable: '--font-gotham',
  display: 'swap',
  preload: true,
  fallback: ['Arial'],
})
export const metadata = {
  title: 'CineShelf — Your stories, your shelf.',
  description: 'ค้นพบภาพยนตร์ทุกประเภท เก็บเรื่องที่รักไว้ในห้องสมุดของคุณ',
}
export default function RootLayout({ children }) {
  return (
    <html lang="th" className={gotham.variable}>
      <body>
        <Suspense fallback={<p role="status">กำลังโหลด CineShelf…</p>}>
          <Providers>{children}</Providers>
        </Suspense>
      </body>
    </html>
  )
}
