import PersonalMovieEditor from '../components/PersonalMovieEditor'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLibrary } from '../context/LibraryContext'
import MovieCard from '../components/MovieCard'
import { Empty, ErrorState, Loading } from '../components/States'
import Icon from '../components/Icon'
export default function Library() {
  const { user, share } = useAuth()
  const {
    movies,
    personal,
    playlists,
    removePlaylist,
    loading,
    error,
    retry,
    metadataError,
    syncError,
  } = useLibrary()
  const [filter, setFilter] = useState('all')
  const [editing, setEditing] = useState(null)
  const [query, setQuery] = useState(''),
    [message, setMessage] = useState(''),
    [sharing, setSharing] = useState(false)
  const visible = movies.filter(
    (movie) =>
      movie.title.toLowerCase().includes(query.toLowerCase()) &&
      (filter === 'all' ||
        personal.some(
          (p) =>
            p.tmdbMovieId === movie.id &&
            (filter === 'favorite'
              ? p.favorite
              : filter === 'watched' || filter === 'watchlist'
                ? p.status === filter
                : p.playlistIds.includes(filter)),
        )),
  )
  const shareUrl = window.location.origin + '/s/' + user?.shareToken
  async function toggleShare() {
    setSharing(true)
    setMessage('')
    try {
      await share(!user.sharing)
    } catch (error) {
      setMessage(error.message)
    } finally {
      setSharing(false)
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setMessage('คัดลอกลิงก์แล้ว ส่งให้เพื่อนได้เลย')
    } catch {
      setMessage('คัดลอกอัตโนมัติไม่ได้ กรุณาเลือกลิงก์ด้านล่างแล้วคัดลอก')
    }
  }
  return (
    <div className="page inner-page">
      <div className="library-heading">
        <div className="page-heading">
          <span className="eyebrow">
            CURATED BY {(user?.name || 'YOU').toUpperCase()}
          </span>
          <h1>
            ห้องสมุดของฉัน<span className="accent">.</span>
          </h1>
          <p>ทุกเรื่องที่รัก ทุกความทรงจำ อยู่บนชั้นนี้</p>
        </div>
        <span className="library-stat">
          <strong>{movies.length.toString().padStart(2, '0')}</strong>{' '}
          เรื่องในคอลเลกชัน
        </span>
      </div>
      {user ? (
        <section className="share-panel">
          <div className="share-description">
            <Icon name="share" size={24} />
            <div>
              <h2>หนังดี ๆ มีไว้แบ่งปัน</h2>
              <p>
                {user.sharing
                  ? 'คนที่มีลิงก์ดูชื่อและรายการหนังได้ โดยไม่ต้องเข้าสู่ระบบ'
                  : 'ห้องสมุดยังเป็นส่วนตัว เปิดแชร์เมื่อต้องการให้เพื่อนดู'}
              </p>
            </div>
          </div>
          <div className="share-actions">
            {user.sharing && (
              <button className="button primary small" onClick={copy}>
                คัดลอกลิงก์
              </button>
            )}
            <button
              className="button secondary small"
              onClick={toggleShare}
              disabled={sharing}
            >
              {sharing
                ? 'กำลังบันทึก…'
                : user.sharing
                  ? 'ปิดการแชร์'
                  : 'เปิดแชร์ห้องสมุด'}
            </button>
          </div>
          {user.sharing && (
            <div className="share-link-row">
              <input
                aria-label="ลิงก์แชร์ห้องสมุด"
                value={shareUrl}
                readOnly
                onFocus={(e) => e.target.select()}
              />
              <Link className="text-link" to={'/s/' + user?.shareToken}>
                ดูหน้าแชร์ ↗
              </Link>
            </div>
          )}
          {message && (
            <p className="share-message" role="status">
              {message}
            </p>
          )}
        </section>
      ) : (
        <p className="notice">
          ห้องสมุดนี้บันทึกในเบราว์เซอร์นี้ ·{' '}
          <Link to="/login">เข้าสู่ระบบเพื่อใช้ห้องสมุดบัญชีและการแชร์</Link>
        </p>
      )}
      <div className="section-heading library-toolbar">
        <h2>
          คอลเลกชันของคุณ <span className="muted">({movies.length})</span>
        </h2>
        <label className="library-search">
          <Icon name="search" />
          <input
            aria-label="ค้นหาในห้องสมุด"
            placeholder="ค้นหาบนชั้นของคุณ…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      <div className="genre-row" aria-label="กรองห้องสมุด">
        {[
          ['all', 'ทั้งหมด'],
          ['favorite', 'เรื่องโปรด'],
          ['watchlist', 'อยากดู'],
          ['watched', 'ดูแล้ว'],
          ...playlists.map((p) => [p.id, p.name]),
        ].map(([id, label]) => (
          <button
            key={id}
            className={filter === id ? 'chip selected' : 'chip'}
            onClick={() => setFilter(id)}
          >
            {label}
          </button>
        ))}
        {playlists.some((p) => p.id === filter) && (
          <button
            className="text-button"
            onClick={() => {
              try {
                removePlaylist(filter)
                setFilter('all')
              } catch (err) {
                setMessage(err.message)
              }
            }}
          >
            ลบเพลย์ลิสต์นี้
          </button>
        )}
      </div>
      {(metadataError || syncError) && (
        <p className="notice" role="status">
          {syncError ||
            'โหลดข้อมูลหนังบางเรื่องไม่ได้ รายการและบันทึกส่วนตัวยังอยู่ครบ'}{' '}
          <button onClick={retry}>ลองอีกครั้ง</button>
        </p>
      )}
      {message && !user && <p role="status">{message}</p>}
      {loading ? (
        <Loading cards />
      ) : error ? (
        <ErrorState error={error} retry={retry} />
      ) : !movies.length ? (
        <Empty />
      ) : !visible.length ? (
        <Empty
          title="ไม่พบหนังบนชั้นนี้"
          text="ลองเปลี่ยนคำค้นดูอีกครั้ง"
          link={false}
        />
      ) : (
        <div className="movie-grid">
          {visible.map((movie) => (
            <div key={movie.id}>
              <MovieCard movie={movie} />
              <button
                className="text-button"
                onClick={() => setEditing(movie.id)}
              >
                บันทึกส่วนตัว
              </button>
            </div>
          ))}
        </div>
      )}
      {editing && <PersonalMovieEditor key={editing} movieId={editing} />}
    </div>
  )
}
