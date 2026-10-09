import Link from 'next/link'
import { usePreview } from '../context/PreviewContext'
import useFetch from '../hooks/useFetch'
import { getBackdropUrl, getPosterUrl } from '../services/tmdb.ts'
import { ErrorState, Loading } from './States'
import LibraryButtons from './LibraryButtons'
import Icon from './Icon'
export default function NowShowing() {
  const { movie: selected, preview } = usePreview()
  const {
    data: movie,
    loading,
    error,
    retry,
  } = useFetch('/api/movies/' + (selected?.id || 157336))
  return (
    <aside className="now-showing" aria-label="รายละเอียดหนังที่เลือก">
      <div className="now-heading">
        <strong>{selected ? 'หนังที่เลือก' : 'แนะนำให้คุณ'}</strong>
        <Icon name="film" size={18} />
      </div>
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState error={error} retry={retry} />
      ) : (
        movie && (
          <>
            <div
              className="now-art"
              style={{
                backgroundImage: `linear-gradient(0deg,#121212,transparent 65%),url("${getBackdropUrl(movie.backdrop_path) || getPosterUrl(movie.poster_path) || ''}")`,
              }}
            >
              <div>
                <Link href={'/movies/' + movie.id}>
                  <h2>{movie.title}</h2>
                </Link>
                <p>
                  {movie.original_title} · {movie.release_date?.slice(0, 4)}
                </p>
              </div>
            </div>
            <div className="now-actions">
              <button
                className="button primary small"
                onClick={() => preview(movie)}
              >
                <Icon name="play" />
                เลือกตัวอย่าง
              </button>
              <LibraryButtons movie={movie} compact />
            </div>
            <section className="now-about">
              <h3>เกี่ยวกับเรื่องนี้</h3>
              <p>{movie.overview || 'ยังไม่มีเรื่องย่อสำหรับเรื่องนี้'}</p>
              <Link className="text-link" href={'/movies/' + movie.id}>
                ดูรายละเอียดทั้งหมด ↗
              </Link>
            </section>
            {!!movie.recommendations?.results?.length && (
              <section className="now-related">
                <h3>เรื่องที่คุณอาจชอบ</h3>
                {movie.recommendations.results.slice(0, 4).map((film) => (
                  <button
                    key={film.id}
                    onClick={() => preview(film)}
                    className="related-film"
                  >
                    {film.poster_path && (
                      <img
                        src={getPosterUrl(film.poster_path, 'w92')}
                        alt=""
                        loading="lazy"
                      />
                    )}
                    <span>
                      <strong>{film.title}</strong>
                      <small>เลือกตัวอย่างหนัง</small>
                    </span>
                    <Icon name="play" size={15} />
                  </button>
                ))}
              </section>
            )}
          </>
        )
      )}
    </aside>
  )
}
