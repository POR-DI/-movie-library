import { cache } from 'react'
import { notFound } from 'next/navigation'
import { movieService } from '../../../../server/service.js'
import MovieDetail from '../../../views/MovieDetail'
// cache(): generateMetadata and the page share one lookup per request.
const getMovie = cache(async (id) => {
  try {
    return await movieService.detail(id)
  } catch (error) {
    if (error.status === 404) notFound()
    throw error
  }
})
export async function generateMetadata({ params }) {
  const { id } = await params
  const movie = await getMovie(id)
  return {
    title: movie.title + ' — CineShelf',
    description: movie.overview?.slice(0, 160) || undefined,
  }
}
export default async function MovieDetailPage({ params }) {
  const { id } = await params
  return <MovieDetail movie={await getMovie(id)} />
}
