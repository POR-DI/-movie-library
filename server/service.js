import 'server-only'
import { createMovieService } from './movies.js'

// One instance per server process so the TMDB in-memory cache is shared by pages and /api.
export const movieService =
  process.env.CINESHELF_SAMPLE_CATALOG === '1'
    ? createMovieService('')
    : createMovieService(process.env.TMDB_READ_TOKEN, process.env.TMDB_API_KEY)
