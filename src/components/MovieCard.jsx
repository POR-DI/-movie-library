import Link from 'next/link'
import { useState } from 'react'
import { poster, year } from '../lib/api'
import Icon from './Icon'
import LibraryButtons from './LibraryButtons'
import { usePreview } from '../context/PreviewContext'
export default function MovieCard({ movie, readOnly = false }) {
  const { preview } = usePreview()
  const [failed, setFailed] = useState(false)
  return (
    <article className="movie-card">
      <div className="poster-wrap">
        <Link
          href={'/movies/' + movie.id}
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
        {movie.vote_average != null && (
          <span className="rating">
            <Icon name="star" size={12} />
            {Number(movie.vote_average).toFixed(1)}
          </span>
        )}
        <button
          className="card-preview"
          aria-label={'เลือกตัวอย่าง ' + movie.title}
          onClick={() => preview(movie)}
        >
          <Icon name="play" />
        </button>
        {!readOnly && <LibraryButtons movie={movie} compact />}
      </div>
      <Link
        className="movie-title"
        href={'/movies/' + movie.id}
        title={movie.title}
      >
        {movie.title}
      </Link>
      {movie.release_date !== undefined && (
        <p className="movie-meta">
          {year(movie)}
          <span>ภาพยนตร์</span>
        </p>
      )}
    </article>
  )
}
