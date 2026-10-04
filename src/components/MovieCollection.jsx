'use client'

import useFetch from '../hooks/useFetch'
import MovieCard from './MovieCard'
import { Empty, ErrorState, Loading } from './States'
// initial: the server-rendered "trending" list; other categories (or a failed server fetch) load here.
export default function MovieCollection({ category, initial = null }) {
  const preset = category === 'trending' ? initial : null
  const fetched = useFetch(preset ? null : '/api/movies?sort=' + category)
  const { loading, error, retry } = fetched
  const data = preset || fetched.data
  if (loading) return <Loading cards />
  if (error) return <ErrorState error={error} retry={retry} />
  if (!data?.results.length)
    return (
      <Empty
        title="ยังไม่มีหนังในหมวดนี้"
        text="ลองกลับมาดูใหม่ภายหลัง"
        link={false}
      />
    )
  return (
    <div className="movie-grid">
      {data.results.slice(0, 6).map((movie) => (
        <MovieCard key={movie.id} movie={movie} />
      ))}
    </div>
  )
}
