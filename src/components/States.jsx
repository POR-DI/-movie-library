import Link from 'next/link'
import Icon from './Icon'
export function Loading({ cards = false }) {
  return cards ? (
    <div className="movie-grid" aria-busy="true" aria-label="กำลังโหลดหนัง">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="skeleton" />
      ))}
    </div>
  ) : (
    <div className="empty" role="status">
      <span className="spinner" />
      กำลังโหลด…
    </div>
  )
}
export function ErrorState({ error, retry }) {
  return (
    <div className="empty" role="alert">
      <Icon name="film" size={36} />
      <h2>ยังโหลดข้อมูลไม่ได้</h2>
      <p>{error.message}</p>
      {retry && (
        <button className="button secondary" onClick={retry}>
          ลองอีกครั้ง
        </button>
      )}
    </div>
  )
}
export function Empty({
  title = 'ยังไม่มีหนังบนชั้นนี้',
  text = 'ค้นพบเรื่องที่ชอบ แล้วเก็บไว้ดูได้ทุกเมื่อ',
  link = true,
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon name="shelf" size={36} />
      </div>
      <h2>{title}</h2>
      <p>{text}</p>
      {link && (
        <Link className="button primary" href="/movies">
          ค้นหาหนัง <Icon name="arrow" />
        </Link>
      )}
    </div>
  )
}
