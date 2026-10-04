'use client'

import useFetch from '../hooks/useFetch'
import MovieCard from './MovieCard'
import { Empty, ErrorState, Loading } from './States'
export default function MovieCollection({ category }) {
  const { data, loading, error, retry } = useFetch(
    '/api/movies?sort=' + category,
  )
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
