import Link from 'next/link'
import Icon from '../../../components/Icon'
export default function MovieNotFound() {
  return (
    <div className="page">
      <div className="empty" role="alert">
        <Icon name="film" size={36} />
        <h2>ยังโหลดข้อมูลไม่ได้</h2>
        <p>ไม่พบหนังเรื่องนี้</p>
      </div>
      <Link className="text-link" href="/movies">
        ← กลับไปสำรวจหนัง
      </Link>
    </div>
  )
}
