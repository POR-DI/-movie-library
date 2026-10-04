import { createServer } from 'node:http'
import { existsSync, statSync, createReadStream } from 'node:fs'
import { resolve, extname, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createMovieService, HttpError } from './movies.js'

const root = fileURLToPath(new URL('../', import.meta.url))

export function createHandler({
  movieService = createMovieService(
    process.env.TMDB_READ_TOKEN,
    process.env.TMDB_API_KEY,
  ),
} = {}) {
  const attempts = new Map()
  function rateLimit(req) {
    const now = Date.now()
    for (const [key, value] of attempts)
      if (value.until < now) attempts.delete(key)
    const key = req.socket.remoteAddress || 'local'
    const entry = attempts.get(key) || { count: 0, until: now + 60000 }
    entry.count++
    attempts.set(key, entry)
    if (entry.count > 240)
      throw new HttpError(429, 'มีคำขอมากเกินไป กรุณารอประมาณหนึ่งนาที')
  }
  return async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
    res.setHeader('X-Frame-Options', 'DENY')
    const json = (status, value) => {
      res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      })
      res.end(JSON.stringify(value))
    }
    try {
      const url = new URL(req.url, 'http://localhost')
      const path = url.pathname
      if (!path.startsWith('/api/')) {
        if (req.method !== 'GET' && req.method !== 'HEAD')
          throw new HttpError(405, 'ไม่รองรับคำขอนี้')
        const dist = resolve(root, 'dist')
        let file = resolve(dist, '.' + decodeURIComponent(path))
        if (!file.startsWith(dist + sep)) file = resolve(dist, 'index.html')
        if (!existsSync(file) || !statSync(file).isFile()) {
          if (extname(path)) throw new HttpError(404, 'ไม่พบไฟล์')
          file = resolve(dist, 'index.html')
        }
        if (!existsSync(file))
          throw new HttpError(
            404,
            'กรุณารัน npm run build หรือเปิดผ่าน Vite ในโหมด dev',
          )
        const types = {
          '.html': 'text/html; charset=utf-8',
          '.js': 'text/javascript',
          '.css': 'text/css',
          '.svg': 'image/svg+xml',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.woff2': 'font/woff2',
        }
        res.writeHead(200, {
          'Content-Type': types[extname(file)] || 'application/octet-stream',
        })
        if (req.method === 'HEAD') res.end()
        else createReadStream(file).pipe(res)
        return
      }
      rateLimit(req)
      if (!['GET', 'HEAD'].includes(req.method)) {
        const allowed = process.env.APP_ORIGIN || 'http://' + req.headers.host
        if (req.headers.origin !== allowed)
          throw new HttpError(403, 'ต้นทางคำขอไม่ถูกต้อง')
      }
      if (path === '/api/config' && req.method === 'GET')
        return json(200, { mode: movieService.mode })
      if (path === '/api/genres' && req.method === 'GET')
        return json(200, await movieService.genres())
      if (path === '/api/movies' && req.method === 'GET')
        return json(200, await movieService.list(url.searchParams))
      if (/^\/api\/movies\/[^/]+$/.test(path) && req.method === 'GET')
        return json(200, await movieService.detail(path.split('/').at(-1)))
      throw new HttpError(404, 'ไม่พบหน้าที่ต้องการ')
    } catch (error) {
      if (!error.status) console.error('Request failed:', error.message)
      if (!res.headersSent)
        json(error.status || 500, {
          error: error.status
            ? error.message
            : 'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง',
        })
      else res.end()
    }
  }
}
export function createApp(options) {
  return createServer(createHandler(options))
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const port = Number(process.env.PORT || 3001)
  const server = createApp()
  server.listen(port, '0.0.0.0', () =>
    console.log(
      `CineShelf server: http://localhost:${port} (${process.env.TMDB_API_KEY || process.env.TMDB_READ_TOKEN ? 'TMDB' : 'sample catalog'})`,
    ),
  )
  for (const signal of ['SIGTERM', 'SIGINT'])
    process.on(signal, () => server.close(() => process.exit(0)))
}
