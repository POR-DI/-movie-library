import { isIP } from 'node:net'
import { createMovieService, HttpError } from './movies.js'
// One service instance preserves the TMDB request cache across Route Handler calls.
export function createApiHandler({
  movieService = createMovieService(
    process.env.TMDB_READ_TOKEN,
    process.env.TMDB_API_KEY,
  ),
  now = Date.now,
  limit = 240,
  clientIdentity = (request) => {
    // Only trust forwarding headers when the ingress overwrites them.
    if (process.env.API_TRUST_PROXY !== '1') return null
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim()
    return ip && isIP(ip) ? ip : null
  },
} = {}) {
  const budgets = new Map()
  return async function handle(request) {
    const json = (status, data) =>
      Response.json(data, {
        status,
        headers: {
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          'X-Frame-Options': 'DENY',
        },
      })
    try {
      const client = clientIdentity(request)
      if (client) {
        const time = now()
        for (const [key, entry] of budgets)
          if (entry.until <= time) budgets.delete(key)
        const entry = budgets.get(client) || { count: 0, until: time + 60000 }
        entry.count++
        if (budgets.size < 10000 || budgets.has(client))
          budgets.set(client, entry)
        if (entry.count > limit)
          throw new HttpError(429, 'มีคำขอมากเกินไป กรุณารอประมาณหนึ่งนาที')
      }
      const url = new URL(request.url),
        path = url.pathname
      if (request.method !== 'GET')
        throw new HttpError(404, 'ไม่พบหน้าที่ต้องการ')
      if (path === '/api/config') return json(200, { mode: movieService.mode })
      if (path === '/api/genres') return json(200, await movieService.genres())
      if (path === '/api/movies')
        return json(200, await movieService.list(url.searchParams))
      if (/^\/api\/movies\/[^/]+$/.test(path))
        return json(200, await movieService.detail(path.split('/').at(-1)))
      throw new HttpError(404, 'ไม่พบหน้าที่ต้องการ')
    } catch (error) {
      if (!error.status)
        console.error('Movie API request failed:', error.message)
      return json(error.status || 500, {
        error: error.status ? error.message : 'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง',
      })
    }
  }
}
