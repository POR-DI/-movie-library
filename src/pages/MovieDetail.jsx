import { useState } from 'react'
import MovieCard from '../components/MovieCard'
import { getBackdropUrl, selectTrailer } from '../services/tmdb.ts'
import { Link, useParams } from 'react-router-dom'
import useFetch from '../hooks/useFetch'
import { poster, year } from '../lib/api'
import LibraryButtons from '../components/LibraryButtons'
import { ErrorState, Loading } from '../components/States'
import Icon from '../components/Icon'
export default function MovieDetail() {
  const { id } = useParams()
  const [failedPoster, setFailedPoster] = useState(false)
  const {
    data: movie,
    loading,
    error,
    retry,
  } = useFetch('/api/movies/' + encodeURIComponent(id))
  if (loading) return <Loading />
  if (error)
    return (
      <div className="page">
        <ErrorState error={error} retry={error.status === 404 ? null : retry} />
        <Link className="text-link" to="/movies">
          ← กลับไปสำรวจหนัง
        </Link>
      </div>
    )
  const director = movie.credits?.crew?.find(
    (person) => person.job === 'Director',
  )
  const trailer = selectTrailer(movie.videos?.results)
  return (
    <div className="detail-page">
      {movie.backdrop_path && (
        <div
          className="detail-backdrop"
          style={{
            backgroundImage: `linear-gradient(0deg,#101112,transparent),url("${getBackdropUrl(movie.backdrop_path)}")`,
          }}
        />
      )}
      <div className="page detail-content">
        <Link className="text-link back-link" to="/movies">
          ← กลับไปสำรวจหนัง
        </Link>
        <div className="detail-grid">
          <div className="detail-poster">
            {movie.poster_path && !failedPoster ? (
              <img
                src={poster(movie.poster_path)}
                alt={'โปสเตอร์ ' + movie.title}
                onError={() => setFailedPoster(true)}
              />
            ) : (
              <Icon name="film" size={80} />
            )}
          </div>
          <section>
            <span className="eyebrow">EVERY FILM TELLS A STORY</span>
            <h1>{movie.title}</h1>
            {movie.original_title !== movie.title && (
              <p className="original-title">{movie.original_title}</p>
            )}
            <div className="detail-meta">
              <span className="accent">
                <Icon name="star" size={17} />{' '}
                {Number(movie.vote_average || 0).toFixed(1)} / 10
              </span>
              <span>{movie.release_date || year(movie)}</span>
              <span>{Number(movie.vote_count || 0).toLocaleString()} โหวต</span>
              {movie.runtime > 0 && (
                <span>
                  {Math.floor(movie.runtime / 60)} ชม. {movie.runtime % 60} นาที
                </span>
              )}
            </div>
            <div className="genre-row">
              {movie.genres?.map((genre) => (
                <Link
                  className="chip"
                  key={genre.id}
                  to={'/movies?genre=' + genre.id}
                >
                  {genre.name}
                </Link>
              ))}
            </div>
            <h2 className="overview-title">เรื่องย่อ</h2>
            <p className="overview">
              {movie.overview || 'ยังไม่มีเรื่องย่อสำหรับเรื่องนี้'}
            </p>
            {movie.overviewLanguage === 'en-US' && movie.overview && (
              <p className="muted">
                เรื่องย่อภาษาอังกฤษ — ยังไม่มีคำแปลภาษาไทย
              </p>
            )}
            {movie.fallbackUnavailable && (
              <p className="notice">
                โหลดข้อมูลภาษาอังกฤษเพิ่มเติมไม่ได้{' '}
                <button onClick={retry}>ลองใหม่</button>
              </p>
            )}
            {director && (
              <p className="muted">
                กำกับโดย <strong>{director.name}</strong>
              </p>
            )}
            <div className="detail-actions">
              <LibraryButtons movie={movie} />
              {trailer && (
                <a
                  className="button secondary"
                  href={'https://www.youtube.com/watch?v=' + trailer.key}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Icon name="play" />
                  ดูตัวอย่างหนัง
                </a>
              )}
            </div>
            {movie.id && (
              <a
                className="text-link tmdb-detail"
                href={'https://www.themoviedb.org/movie/' + movie.id}
                target="_blank"
                rel="noreferrer"
              >
                ดูข้อมูลเพิ่มเติมที่ TMDB ↗
              </a>
            )}
          </section>
        </div>
        {Boolean(movie.credits?.cast?.length) && (
          <section className="cast-section">
            <span className="eyebrow">THE FACES BEHIND THE STORY</span>
            <h2>นักแสดง</h2>
            <div className="cast-grid">
              {movie.credits.cast.slice(0, 6).map((person) => (
                <div className="cast-card" key={person.id}>
                  <div className="cast-image">
                    {person.profile_path ? (
                      <img
                        src={poster(person.profile_path, 'w185')}
                        alt={person.name}
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : (
                      <Icon name="user" size={36} />
                    )}
                  </div>
                  <strong>{person.name}</strong>
                  <span>{person.character}</span>
                </div>
              ))}
            </div>
          </section>
        )}
        {[
          ['recommendations', 'หนังแนะนำ'],
          ['similar', 'หนังที่คล้ายกัน'],
        ].map(([key, title]) => (
          <section className="discovery-section" key={key}>
            <div className="section-heading">
              <h2>{title}</h2>
            </div>
            {movie[key]?.results?.length ? (
              <div className="movie-grid">
                {movie[key].results.slice(0, 6).map((item) => (
                  <MovieCard key={item.id} movie={item} />
                ))}
              </div>
            ) : (
              <p className="muted">ยังไม่มีรายการ{title}</p>
            )}
          </section>
        ))}
      </div>
    </div>
  )
}
