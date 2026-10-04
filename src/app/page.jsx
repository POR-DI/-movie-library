import { movieService } from '../../server/service.js'
import Home from '../views/Home'
// ISR: rebuilt at most once an hour; a failed fetch falls back to the client (hero without image, tabs fetch /api).
export const revalidate = 3600
export default async function HomePage() {
  const [featured, trending] = await Promise.all([
    movieService.detail('157336').catch(() => null),
    movieService
      .list(new URLSearchParams({ sort: 'trending' }))
      .catch(() => null),
  ])
  return <Home featured={featured} trending={trending} />
}
