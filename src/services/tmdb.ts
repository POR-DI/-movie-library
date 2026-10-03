import type { Genre, Movie, MovieDetails, Page, Video } from '../types/tmdb.ts'
const BASE_URL = 'https://api.themoviedb.org/3'
const IMAGE_URL = 'https://image.tmdb.org/t/p'
type Params = Record<string, string | number | boolean>
export class TmdbError extends Error {
  status: number
  constructor(message: string, status = 0) {
    super(message)
    this.name = 'TmdbError'
    this.status = status
  }
}
export function getPosterUrl(
  path: string | null | undefined,
  size:
    'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'original' = 'w500',
) {
  return path?.startsWith('/') ? `${IMAGE_URL}/${size}${path}` : null
}
export function getBackdropUrl(
  path: string | null | undefined,
  size: 'w300' | 'w780' | 'w1280' | 'original' = 'original',
) {
  return path?.startsWith('/') ? `${IMAGE_URL}/${size}${path}` : null
}
export function selectTrailer(videos: Video[] = []) {
  return videos
    .filter((v) => v.site === 'YouTube' && /^[\w-]+$/.test(v.key))
    .sort((a, b) => videoRank(b) - videoRank(a))[0]
}
function videoRank(v: Video) {
  return (
    (v.type === 'Trailer' ? 100 : v.type === 'Teaser' ? 50 : 0) +
    (v.official ? 10 : 0)
  )
}
const emptyPage = (): Page<Movie> => ({
  page: 1,
  results: [],
  total_pages: 0,
  total_results: 0,
})
export function createTmdbService(
  token: string,
  transport: typeof fetch = fetch,
  ttl = 300_000,
  apiKey = '',
) {
  const cache = new Map<string, { expires: number; value: unknown }>()
  const pending = new Map<string, Promise<unknown>>()
  async function request<T>(path: string, params: Params = {}): Promise<T> {
    if (!token.trim() && !apiKey.trim())
      throw new TmdbError(
        'กรุณาตั้งค่า TMDB_API_KEY หรือ TMDB_READ_TOKEN ที่เซิร์ฟเวอร์แล้วเริ่มใหม่',
      )
    const url = new URL(BASE_URL + path)
    url.search = new URLSearchParams(
      Object.entries({ language: 'th-TH', region: 'TH', ...params }).map(
        ([k, v]) => [k, String(v)],
      ),
    ).toString()
    if (apiKey.trim()) url.searchParams.set('api_key', apiKey.trim())
    const key = url.toString()
    const hit = cache.get(key)
    if (hit && hit.expires > Date.now()) return hit.value as T
    if (pending.has(key)) return pending.get(key) as Promise<T>
    const task = (async () => {
      let response: Response
      try {
        response = await transport(url, {
          headers: {
            Accept: 'application/json',
            ...(token.trim() ? { Authorization: `Bearer ${token.trim()}` } : {}),
          },
          signal: AbortSignal.timeout(12000),
        })
      } catch {
        throw new TmdbError(
          'เชื่อมต่อ TMDB ไม่ได้ กรุณาตรวจเครือข่ายแล้วลองอีกครั้ง',
        )
      }
      // Never surface response bodies or credentials in errors/UI/logs.
      if (!response.ok)
        throw new TmdbError(
          response.status === 401 || response.status === 403
            ? 'TMDB ไม่อนุญาตการเข้าถึง กรุณาตรวจการตั้งค่า token'
            : response.status === 404
              ? 'ไม่พบหนังเรื่องนี้'
              : response.status === 429
                ? 'TMDB มีคำขอมากเกินไป กรุณารอสักครู่แล้วลองใหม่'
                : 'โหลดข้อมูลจาก TMDB ไม่ได้ กรุณาลองอีกครั้ง',
          response.status,
        )
      let value: unknown
      try {
        value = await response.json()
      } catch {
        throw new TmdbError('TMDB ส่งข้อมูลที่อ่านไม่ได้')
      }
      if (
        !value ||
        typeof value !== 'object' ||
        ('success' in value && value.success === false)
      )
        throw new TmdbError('TMDB ไม่สามารถให้ข้อมูลนี้ได้')
      if (cache.size >= 200) cache.delete(cache.keys().next().value!)
      cache.set(key, { value, expires: Date.now() + ttl })
      return value as T
    })()
    pending.set(key, task)
    try {
      return await task
    } finally {
      pending.delete(key)
    }
  }
  async function list(path: string, page = 1, params: Params = {}) {
    const data = await request<Page<Movie>>(path, { page, ...params })
    if (!Array.isArray(data.results))
      throw new TmdbError('รูปแบบรายการหนังจาก TMDB ไม่ถูกต้อง')
    return { ...data, total_pages: Math.min(data.total_pages, 500) }
  }
  const getTrendingMovies = (page = 1) => list('/trending/movie/week', page)
  const getPopularMovies = (page = 1) => list('/movie/popular', page)
  const getTopRatedMovies = (page = 1) => list('/movie/top_rated', page)
  const getNowPlayingMovies = (page = 1) => list('/movie/now_playing', page)
  const getUpcomingMovies = (page = 1) => list('/movie/upcoming', page)
  const searchMovies = (query: string, page = 1) =>
    query.trim()
      ? list('/search/movie', page, {
          query: query.trim(),
          include_adult: false,
        })
      : Promise.resolve(emptyPage())
  async function getMovieDetails(id: number | string): Promise<MovieDetails> {
    if (
      !/^\d+$/.test(String(id)) ||
      !Number.isSafeInteger(Number(id)) ||
      Number(id) < 1
    )
      throw new TmdbError('ไม่พบหนังเรื่องนี้', 404)
    const params = {
      append_to_response: 'credits,videos,images,recommendations,similar',
      include_image_language: 'th,en,null',
      include_video_language: 'th,en,null',
    }
    const movie = await request<MovieDetails>(`/movie/${id}`, params)
    if (!movie.id || !movie.title)
      throw new TmdbError('รูปแบบรายละเอียดหนังจาก TMDB ไม่ถูกต้อง')
    if (movie.overview?.trim() && selectTrailer(movie.videos?.results))
      return { ...movie, overviewLanguage: 'th-TH' }
    try {
      const english = await request<MovieDetails>(`/movie/${id}`, {
        language: 'en-US',
        append_to_response: 'videos',
      })
      return {
        ...movie,
        overview: movie.overview?.trim()
          ? movie.overview
          : english.overview || '',
        overviewLanguage: movie.overview?.trim() ? 'th-TH' : 'en-US',
        videos: {
          results: [
            ...(movie.videos?.results || []),
            ...(english.videos?.results || []),
          ].filter(
            (v, i, a) => a.findIndex((other) => other.id === v.id) === i,
          ),
        },
      }
    } catch {
      return { ...movie, overviewLanguage: 'th-TH', fallbackUnavailable: true }
    }
  }
  const getGenres = () => request<{ genres: Genre[] }>('/genre/movie/list')
  async function browse(params: URLSearchParams) {
    const q = (params.get('q') || '').trim()
    const page = Math.max(
      1,
      Math.min(500, Number.parseInt(params.get('page') || '') || 1),
    )
    if (q) return searchMovies(q, page)
    if (params.get('genre'))
      return list('/discover/movie', page, {
        with_genres: params.get('genre')!,
        sort_by:
          params.get('sort') === 'rating'
            ? 'vote_average.desc'
            : 'popularity.desc',
        'vote_count.gte': 100,
        include_adult: false,
      })
    switch (params.get('sort')) {
      case 'trending':
        return getTrendingMovies(page)
      case 'rating':
        return getTopRatedMovies(page)
      case 'now_playing':
        return getNowPlayingMovies(page)
      case 'upcoming':
        return getUpcomingMovies(page)
      default:
        return getPopularMovies(page)
    }
  }
  return {
    getTrendingMovies,
    getPopularMovies,
    getTopRatedMovies,
    getNowPlayingMovies,
    getUpcomingMovies,
    searchMovies,
    getMovieDetails,
    getGenres,
    browse,
    clearCache: () => cache.clear(),
  }
}
