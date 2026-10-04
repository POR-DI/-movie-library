import { HttpError } from './movies.js'

// Web Request → Response so the same code runs in a Next.js Route Handler and in node --test.
export function createApiHandler({ movieService, limit = 240 }) {
  const attempts = new Map()
  function rateLimit(request) {
    const now = Date.now()
    for (const [key, value] of attempts)
      if (value.until < now) attempts.delete(key)
    const key =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local'
    const entry = attempts.get(key) || { count: 0, until: now + 60000 }
    entry.count++
    attempts.set(key, entry)
    if (entry.count > limit)
      throw new HttpError(429, 'มีคำขอมากเกินไป กรุณารอประมาณหนึ่งนาที')
  }
  const json = (status, value) =>
    new Response(JSON.stringify(value), {
      status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    })
  return async (request) => {
    try {
      rateLimit(request)
      const url = new URL(request.url)
      const path = url.pathname
      const get = request.method === 'GET' || request.method === 'HEAD'
      if (get && path === '/api/config')
        return json(200, { mode: movieService.mode })
      if (get && path === '/api/genres')
        return json(200, await movieService.genres())
      if (get && path === '/api/movies')
        return json(200, await movieService.list(url.searchParams))
      if (get && /^\/api\/movies\/[^/]+$/.test(path))
        return json(200, await movieService.detail(path.split('/').at(-1)))
      throw new HttpError(404, 'ไม่พบหน้าที่ต้องการ')
    } catch (error) {
      if (!error.status) console.error('Request failed:', error.message)
      return json(error.status || 500, {
        error: error.status ? error.message : 'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง',
      })
    }
  }
}
