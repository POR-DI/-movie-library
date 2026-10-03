import { useState } from 'react'
import { useLibrary } from '../context/LibraryContext'
export default function PersonalMovieEditor({ movieId }) {
  const { personal, playlists, updatePersonal, createPlaylist } = useLibrary()
  const entry = personal.find((m) => m.tmdbMovieId === movieId)
  const [message, setMessage] = useState('')
  const [newPlaylist, setNewPlaylist] = useState('')
  if (!entry) return null
  function update(patch) {
    try {
      updatePersonal(movieId, patch)
      setMessage('บันทึกในเครื่องแล้ว')
    } catch (error) {
      setMessage(error.message)
    }
  }
  function addPlaylist(event) {
    event.preventDefault()
    try {
      const id = createPlaylist(newPlaylist)
      if (id) update({ playlistIds: [...new Set([...entry.playlistIds, id])] })
      setNewPlaylist('')
    } catch (error) {
      setMessage(error.message)
    }
  }
  return (
    <section className="personal-editor">
      <h2>บันทึกของฉัน</h2>
      <div className="personal-fields">
        <label>
          สถานะ
          <select
            aria-label="สถานะ"
            value={entry.status}
            onChange={(e) => update({ status: e.target.value })}
          >
            <option value="watchlist">อยากดู</option>
            <option value="watched">ดูแล้ว</option>
          </select>
        </label>
        <label>
          คะแนนของฉัน
          <select
            aria-label="คะแนนของฉัน"
            value={entry.rating ?? ''}
            onChange={(e) =>
              update({
                rating: e.target.value === '' ? null : Number(e.target.value),
              })
            }
          >
            <option value="">ยังไม่ให้คะแนน</option>
            {Array.from({ length: 11 }, (_, n) => (
              <option key={n} value={n}>
                {n} / 10
              </option>
            ))}
          </select>
        </label>
        <label>
          วันที่ดู
          <input
            type="date"
            value={entry.watchedAt}
            onChange={(e) => update({ watchedAt: e.target.value })}
          />
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            checked={entry.favorite}
            onChange={(e) => update({ favorite: e.target.checked })}
          />
          เรื่องโปรด
        </label>
      </div>
      <label>
        รีวิวของฉัน
        <textarea
          value={entry.review}
          maxLength={5000}
          rows={3}
          onChange={(e) => update({ review: e.target.value })}
        />
      </label>
      <div className="genre-row">
        {playlists.map((p) => (
          <label className="chip" key={p.id}>
            <input
              type="checkbox"
              checked={entry.playlistIds.includes(p.id)}
              onChange={(e) =>
                update({
                  playlistIds: e.target.checked
                    ? [...entry.playlistIds, p.id]
                    : entry.playlistIds.filter((id) => id !== p.id),
                })
              }
            />
            {p.name}
          </label>
        ))}
      </div>
      <form className="search-box" onSubmit={addPlaylist}>
        <input
          aria-label="ชื่อเพลย์ลิสต์ใหม่"
          placeholder="สร้างเพลย์ลิสต์…"
          value={newPlaylist}
          maxLength={80}
          onChange={(e) => setNewPlaylist(e.target.value)}
        />
        <button
          className="button secondary small"
          disabled={!newPlaylist.trim()}
        >
          เพิ่มเพลย์ลิสต์
        </button>
      </form>
      {message && (
        <p className="muted" role="status">
          {message}
        </p>
      )}
    </section>
  )
}
