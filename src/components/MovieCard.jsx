import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useLibrary } from '../context/LibraryContext'
import { poster, year } from '../lib/api'
import Icon from './Icon'
export function SaveButton({ movie, compact = false }) {
  const { has, toggle, busy, loading, error: libraryError } = useLibrary()
  const [error, setError] = useState('')
  const saved = has(movie.id)
  async function save() {
    setError('')
    try {
      await toggle(movie)
    } catch (error) {
      setError(error.message)
    }
  }
  return (
    <div className={compact ? 'save-wrap compact' : 'save-wrap'}>
      <button
        className={
          compact
            ? 'save-icon' + (saved ? ' saved' : '')
            : 'button ' + (saved ? 'secondary' : 'primary')
        }
        aria-label={
          (saved ? 'นำออกจาก' : 'เพิ่มเข้า') + 'ห้องสมุด: ' + movie.title
        }
        aria-pressed={saved}
        disabled={busy || loading || Boolean(libraryError)}
        onClick={save}
      >
        <Icon name={saved ? 'check' : 'plus'} />
        {!compact && (saved ? 'อยู่ในห้องสมุดแล้ว' : 'เก็บเข้าห้องสมุด')}
      </button>
      {error && (
        <small className="field-error" role="alert">
          {error}
        </small>
      )}
    </div>
  )
}
export default function MovieCard({ movie, readOnly = false }) {
  const [failed, setFailed] = useState(false)
  return (
    <article className="movie-card">
      <div className="poster-wrap">
        <Link
          to={'/movies/' + movie.id}
          className="poster-link"
          aria-label={'ดูรายละเอียด ' + movie.title}
        >
          {poster(movie.poster_path) && !failed ? (
            <img
              src={poster(movie.poster_path)}
              alt={'โปสเตอร์ ' + movie.title}
              loading="lazy"
              onError={() => setFailed(true)}
            />
          ) : (
            <div className="poster-placeholder">
              <Icon name="film" size={38} />
              <span>{movie.title}</span>
            </div>
          )}
        </Link>
        <span className="rating">
          <Icon name="star" size={12} />
          {Number(movie.vote_average || 0).toFixed(1)}
        </span>
        {!readOnly && <SaveButton movie={movie} compact />}
      </div>
      <Link className="movie-title" to={'/movies/' + movie.id}>
        {movie.title}
      </Link>
      <p className="movie-meta">
        {year(movie)}
        <span>ภาพยนตร์</span>
      </p>
    </article>
  )
}
