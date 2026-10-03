import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import useFetch from '../hooks/useFetch'
import MovieCollection from '../components/MovieCollection'
import { getBackdropUrl } from '../services/tmdb.ts'
import Icon from '../components/Icon'
export default function Home() {
  const [category, setCategory] = useState('trending')
  const { data: featured } = useFetch('/api/movies/157336')
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  function search(event) {
    event.preventDefault()
    navigate(
      '/movies' +
        (query.trim() ? '?q=' + encodeURIComponent(query.trim()) : ''),
    )
  }
  return (
    <div className="page home">
      <section className="hero">
        <div
          className="hero-photo"
          style={{
            backgroundImage: featured?.backdrop_path
              ? `url("${getBackdropUrl(featured.backdrop_path)}")`
              : undefined,
          }}
        />
        <div className="hero-shade" />
        <div className="hero-content">
          <span className="eyebrow">
            <span className="live-dot" /> YOUR PERSONAL FILM COLLECTION
          </span>
          <h1>
            เรื่องราวที่คุณรัก
            <br />
            เก็บไว้บน<span>ชั้นของคุณ.</span>
          </h1>
          <p>
            บางเรื่องดูจบ แต่ยังอยู่ในใจ
            <br />
            ค้นพบ เก็บสะสม และแชร์หนังเรื่องโปรดให้คนที่คุณรัก
          </p>
          <form className="hero-search" onSubmit={search}>
            <Icon name="search" />
            <input
              aria-label="ค้นหาหนังเรื่องโปรด"
              placeholder="วันนี้อยากเก็บหนังเรื่องไหน?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              maxLength={150}
            />
            <button className="button primary" type="submit">
              ค้นหาหนัง <Icon name="arrow" size={17} />
            </button>
          </form>
          <div className="hero-hint">
            <span>มากกว่าลิสต์หนัง</span>
            <span className="dot-separator">•</span>พื้นที่เล็ก ๆ
            สำหรับรสนิยมของคุณ
          </div>
        </div>
        <Link to="/movies/157336" className="hero-caption">
          <span className="hero-caption-label">ON THE BIG SCREEN</span>
          <strong>{featured?.original_title || 'CINESHELF'}</strong>
          <span>
            {featured?.release_date?.slice(0, 4)} <span>·</span>{' '}
            {featured?.credits?.crew?.find((p) => p.job === 'Director')?.name}{' '}
            <Icon name="arrow" size={16} />
          </span>
        </Link>
        <span className="hero-index">
          01 <span>/ YOUR NEXT FAVORITE</span>
        </span>
      </section>
      <section className="discovery-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">THE DISCOVERY ROOM</span>
            <h2>
              เรื่องต่อไปที่อาจกลายเป็นเรื่องโปรด
              <span className="accent">.</span>
            </h2>
          </div>
          <Link className="text-link" to="/movies">
            สำรวจหนังทั้งหมด <Icon name="arrow" size={18} />
          </Link>
        </div>
        <div className="genre-row" aria-label="หมวดภาพยนตร์">
          {[
            ['trending', 'Trending'],
            ['popular', 'Popular'],
            ['rating', 'Top Rated'],
            ['now_playing', 'Now Playing'],
            ['upcoming', 'Upcoming'],
          ].map(([id, label]) => (
            <button
              key={id}
              className={category === id ? 'chip selected' : 'chip'}
              aria-pressed={category === id}
              onClick={() => setCategory(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <MovieCollection category={category} />
      </section>
      <section className="shelf-invite">
        <div className="invite-icon">
          <Icon name="shelf" size={38} />
        </div>
        <div>
          <span className="eyebrow">A LITTLE MORE YOU</span>
          <h2>หนังที่ชอบ บอกความเป็นคุณ</h2>
          <p>สร้างห้องสมุดของคุณ แล้วส่งต่อเรื่องราวดี ๆ ให้เพื่อน</p>
        </div>
        <Link to="/library" className="button secondary">
          ไปที่ห้องสมุดของฉัน <Icon name="arrow" />
        </Link>
      </section>
    </div>
  )
}
