import { createTmdbService } from '../src/services/tmdb.ts'
import { demoMovies, genres } from './demo.js'
export class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}
export function createMovieService(token = '', apiKey = '') {
  const mode = token || apiKey ? 'tmdb' : 'demo'
  const remote = createTmdbService(token, undefined, undefined, apiKey)
  async function run(task) {
    try {
      return await task()
    } catch (error) {
      throw new HttpError(error.status === 404 ? 404 : 502, error.message)
    }
  }
  return {
    mode,
    async genres() {
      return mode === 'demo' ? { genres } : run(() => remote.getGenres())
    },
    async list(params) {
      const q = (params.get('q') || '').trim().slice(0, 150)
      const page = Math.max(
        1,
        Math.min(500, Number.parseInt(params.get('page')) || 1),
      )
      const genre = Number(params.get('genre')) || 0
      const year = params.get('year') || ''
      const language = params.get('language') || ''
      if (year && !/^\d{4}$/.test(year))
        throw new HttpError(400, 'ปีที่ฉายต้องเป็นตัวเลข 4 หลัก')
      if (language && !/^[a-z]{2}$/.test(language))
        throw new HttpError(400, 'ภาษาต้นฉบับต้องเป็นรหัสภาษา 2 ตัว')
      const sort =
        params.get('sort') === 'rating'
          ? 'vote_average.desc'
          : 'popularity.desc'
      if (mode === 'demo') {
        let results = demoMovies.filter(
          (movie) =>
            (movie.title.toLowerCase().includes(q.toLowerCase()) ||
              movie.original_title.toLowerCase().includes(q.toLowerCase())) &&
            (q ||
              ((!genre || movie.genre_ids.includes(genre)) &&
                (!year || movie.release_date.startsWith(year)) &&
                (!language || movie.original_language === language))),
        )
        if (sort === 'vote_average.desc')
          results = [...results].sort((a, b) => b.vote_average - a.vote_average)
        if (!q && ['newest', 'oldest'].includes(params.get('sort')))
          results = [...results].sort((a, b) =>
            params.get('sort') === 'newest'
              ? b.release_date.localeCompare(a.release_date)
              : a.release_date.localeCompare(b.release_date),
          )
        return {
          mode,
          results: results.slice((page - 1) * 20, page * 20),
          page,
          total_pages: Math.max(1, Math.ceil(results.length / 20)),
          total_results: results.length,
        }
      }
      const data = await run(() => remote.browse(params))
      return { ...data, total_pages: Math.min(data.total_pages, 500), mode }
    },
    async detail(id) {
      if (!/^\d+$/.test(String(id)) || Number(id) < 1)
        throw new HttpError(404, 'ไม่พบหนังเรื่องนี้')
      const movie =
        mode === 'demo'
          ? demoMovies.find((movie) => movie.id === Number(id))
          : await run(() => remote.getMovieDetails(id))
      if (!movie || movie.adult) throw new HttpError(404, 'ไม่พบหนังเรื่องนี้')
      return { ...movie, mode }
    },
  }
}
