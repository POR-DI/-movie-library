import Link from 'next/link'
import { useLocation } from '../lib/navigation'
import { useAuth } from '../context/AuthContext'
import { useLibrary } from '../context/LibraryContext'
import Icon from './Icon'
const kinds = [
  {
    kind: 'liked',
    icon: 'heart',
    on: 'เลิกถูกใจ',
    off: 'ถูกใจ',
    label: 'ถูกใจแล้ว',
  },
  {
    kind: 'watchlist',
    icon: 'bookmark',
    on: 'นำออกจากอยากดู',
    off: 'เพิ่มในอยากดู',
    label: 'อยู่ในอยากดู',
  },
]
export default function LibraryButtons({ movie, compact = false }) {
  const { user } = useAuth()
  const { has, isPending, toggle, loading } = useLibrary()
  const location = useLocation()
  const wrap = compact ? 'save-wrap compact' : 'save-wrap'
  const cls = (active) =>
    compact
      ? 'save-icon' + (active ? ' saved' : '')
      : 'button ' + (active ? 'secondary' : 'primary')
  if (!user)
    return (
      <div className={wrap}>
        {kinds.map(({ kind, icon, off }) => (
          <Link
            key={kind}
            className={cls(false)}
            href={'/login?next=' + encodeURIComponent(location.pathname)}
            aria-label={off + ': ' + movie.title + ' (ต้องเข้าสู่ระบบ)'}
          >
            <Icon name={icon} />
            {!compact && off}
          </Link>
        ))}
      </div>
    )
  return (
    <div className={wrap}>
      {kinds.map(({ kind, icon, on, off, label }) => {
        const active = has(movie.id, kind)
        return (
          <button
            key={kind}
            className={cls(active)}
            aria-label={(active ? on : off) + ': ' + movie.title}
            aria-pressed={active}
            disabled={loading || isPending(movie.id, kind)}
            onClick={() => toggle(movie, kind)}
          >
            <Icon name={icon} />
            {!compact && (active ? label : off)}
          </button>
        )
      })}
    </div>
  )
}
