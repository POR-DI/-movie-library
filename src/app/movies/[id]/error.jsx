'use client'

import Link from 'next/link'
import { ErrorState } from '../../../components/States'
// Production hides Server Component error messages, so show a fixed Thai message.
const message = new Error('โหลดข้อมูลจาก TMDB ไม่ได้ กรุณาลองอีกครั้ง')
export default function MovieError({ retry }) {
  return (
    <div className="page">
      <ErrorState error={message} retry={retry} />
      <Link className="text-link" href="/movies">
        ← กลับไปสำรวจหนัง
      </Link>
    </div>
  )
}
