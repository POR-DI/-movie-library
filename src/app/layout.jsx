import { Suspense } from 'react'
import Providers from './providers'
import '../index.css'
export const metadata = {
  title: 'CineShelf — Your stories, your shelf.',
  description: 'ค้นพบภาพยนตร์ทุกประเภท เก็บเรื่องที่รักไว้ในห้องสมุดของคุณ',
}
export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>
        <Suspense fallback={<p role="status">กำลังโหลด CineShelf…</p>}>
          <Providers>{children}</Providers>
        </Suspense>
      </body>
    </html>
  )
}
