import Page from '../screens/Home'
import { createMovieService } from '../../server/movies.js'
// Explicit SSR: render public movie data on every request, not at build time.
export const dynamic = 'force-dynamic'
export const revalidate = 0
const movies = createMovieService(
  process.env.TMDB_READ_TOKEN,
  process.env.TMDB_API_KEY,
)
export default async function RoutePage() {
  let initialReleases = null
  try {
    initialReleases = await movies.list(
      new URLSearchParams({ sort: 'now_playing' }),
    )
  } catch {
    // Client fetching retains its visible error and retry UI if upstream is unavailable.
  }
  return <Page initialReleases={initialReleases} />
}
