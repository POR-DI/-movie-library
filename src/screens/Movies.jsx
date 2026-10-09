import { useEffect, useState } from 'react'
import { useSearchParams } from '../lib/navigation'
import useFetch from '../hooks/useFetch'
import MovieCard from '../components/MovieCard'
import { Empty, ErrorState, Loading } from '../components/States'
import Icon from '../components/Icon'
export default function Movies() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') || '',
    genre = params.get('genre') || '',
    sort = params.get('sort') || 'popular'
  const year = params.get('year') || ''
  const language = params.get('language') || ''
  const filtering = Boolean(genre || year || language)
  const [draft, setDraft] = useState(q)
  useEffect(() => setDraft(q), [q])
  useEffect(() => {
    if (draft.trim() === q) return
    const timer = setTimeout(() => {
      const next = new URLSearchParams(params)
      next.delete('page')
      next.delete('genre')
      next.delete('sort')
      next.delete('year')
      next.delete('language')
      if (draft.trim()) next.set('q', draft.trim())
      else next.delete('q')
      setParams(next, { replace: true })
    }, 400)
    return () => clearTimeout(timer)
  }, [draft, q, params, setParams])
  const searching = draft.trim() !== q
  const page = Math.max(1, Math.min(500, parseInt(params.get('page')) || 1))
  const query = new URLSearchParams({
    q,
    genre: q ? '' : genre,
    sort: q ? 'popular' : sort,
    page,
    year: q ? '' : year,
    language: q ? '' : language,
  })
  const { data, loading, error, retry } = useFetch(
    searching ? null : '/api/movies?' + query,
  )
  const genres = useFetch('/api/genres')
  function update(values) {
    const next = new URLSearchParams(params)
    next.delete('page')
    for (const [key, value] of Object.entries(values)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setParams(next, { replace: true })
  }
  function search(event) {
    event.preventDefault()
    update({
      q: new FormData(event.currentTarget).get('q').trim(),
      genre: '',
      sort: '',
      year: '',
      language: '',
    })
  }
  return (
    <div className="page inner-page">
      <div className="page-heading">
        <span className="eyebrow">FIND YOUR NEXT FAVORITE</span>
        <h1>
          สำรวจโลกของภาพยนตร์<span className="accent">.</span>
        </h1>
        <p>จากเรื่องที่ใคร ๆ ก็รัก ถึงเรื่องเล็ก ๆ ที่รอให้คุณค้นพบ</p>
      </div>
      <div className="search-toolbar">
        <form className="search-box" onSubmit={search}>
          <Icon name="search" />
          <input
            name="q"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={150}
            aria-label="ชื่อภาพยนตร์"
            placeholder="ค้นหาชื่อภาพยนตร์ ไทยหรืออังกฤษ…"
          />
          <button className="button primary small">ค้นหา</button>
        </form>
        <label className="select-label">
          เรียงตาม
          <select
            value={sort}
            disabled={Boolean(q)}
            onChange={(e) => update({ sort: e.target.value })}
          >
            <option value="popular">ความนิยม</option>
            <option value="rating">คะแนนสูงสุด</option>
            <option value="newest">ใหม่ไปเก่า</option>
            <option value="oldest">เก่าไปใหม่</option>
            <option disabled={filtering} value="trending">
              มาแรง
            </option>
            <option disabled={filtering} value="now_playing">
              กำลังฉาย
            </option>
            <option disabled={filtering} value="upcoming">
              เร็ว ๆ นี้
            </option>
          </select>
        </label>
      </div>
      <div className="filter-toolbar">
        <label className="select-label">
          ปีที่ฉาย
          <select
            value={year}
            disabled={Boolean(q)}
            onChange={(e) =>
              update({
                year: e.target.value,
                sort: ['popular', 'rating', 'newest', 'oldest'].includes(sort)
                  ? sort
                  : 'popular',
              })
            }
          >
            <option value="">ทุกปี</option>
            {Array.from(
              { length: new Date().getFullYear() - 1894 },
              (_, i) => new Date().getFullYear() + 1 - i,
            ).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="select-label">
          ภาษาต้นฉบับ
          <select
            value={language}
            disabled={Boolean(q)}
            onChange={(e) =>
              update({
                language: e.target.value,
                sort: ['popular', 'rating', 'newest', 'oldest'].includes(sort)
                  ? sort
                  : 'popular',
              })
            }
          >
            <option value="">ทุกภาษา</option>
            {[
              ['th', 'ไทย'],
              ['en', 'อังกฤษ'],
              ['ja', 'ญี่ปุ่น'],
              ['ko', 'เกาหลี'],
              ['zh', 'จีน'],
              ['fr', 'ฝรั่งเศส'],
              ['es', 'สเปน'],
              ['hi', 'ฮินดี'],
            ].map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button
          className="text-button"
          onClick={() => {
            setDraft('')
            setParams({}, { replace: true })
          }}
        >
          ล้างคำค้นและตัวกรอง
        </button>
      </div>
      <div className="genre-row" aria-label="ประเภทหนัง">
        <button
          className={!genre ? 'chip selected' : 'chip'}
          disabled={Boolean(q)}
          aria-pressed={!genre}
          onClick={() => update({ genre: '' })}
        >
          ทั้งหมด
        </button>
        {genres.data?.genres.map((item) => (
          <button
            key={item.id}
            className={genre === String(item.id) ? 'chip selected' : 'chip'}
            disabled={Boolean(q)}
            aria-pressed={genre === String(item.id)}
            onClick={() =>
              update({
                genre: String(item.id),
                sort: ['popular', 'rating', 'newest', 'oldest'].includes(sort)
                  ? sort
                  : 'popular',
              })
            }
          >
            {item.name}
          </button>
        ))}
      </div>
      {genres.error && (
        <p className="notice">
          โหลดประเภทหนังไม่ได้{' '}
          <button className="text-button" onClick={genres.retry}>
            ลองใหม่
          </button>
        </p>
      )}
      {q && (
        <div className="search-summary">
          <span>
            ผลการค้นหา “{q}”{' '}
            <small>ค้นหาตามชื่อ · ประเภทและการเรียงใช้ในหน้าสำรวจ</small>
          </span>
          <button
            className="text-button"
            onClick={() => {
              setDraft('')
              update({ q: '' })
            }}
          >
            ล้างคำค้น <Icon name="close" size={15} />
          </button>
        </div>
      )}
      <div className="results-label">
        <span>
          {loading || searching
            ? 'กำลังค้นหา…'
            : data
              ? `${data.total_results.toLocaleString()} เรื่องให้ค้นพบ`
              : 'รายการภาพยนตร์'}
        </span>
        <span>
          {data?.mode === 'demo' ? 'SAMPLE COLLECTION' : 'POWERED BY TMDB'}
        </span>
      </div>
      {loading || searching ? (
        <Loading cards />
      ) : error ? (
        <ErrorState error={error} retry={retry} />
      ) : !data?.results.length ? (
        <Empty
          title="ยังไม่เจอเรื่องที่ค้นหา"
          text="ลองใช้ชื่อภาษาอังกฤษ เปลี่ยนคำค้น หรือเลือกประเภทอื่น"
          link={false}
        />
      ) : (
        <div className="movie-grid">
          {data.results.map((movie) => (
            <MovieCard movie={movie} key={movie.id} />
          ))}
        </div>
      )}
      {!loading && !searching && !error && data && data.total_pages > 1 && (
        <div className="pagination">
          <button
            className="button secondary"
            disabled={page <= 1}
            onClick={() => update({ page: String(page - 1) })}
          >
            ← ก่อนหน้า
          </button>
          <span>
            หน้า {page} / {data.total_pages}
          </span>
          <button
            className="button secondary"
            disabled={page >= data.total_pages}
            onClick={() => update({ page: String(page + 1) })}
          >
            ถัดไป →
          </button>
        </div>
      )}
    </div>
  )
}
