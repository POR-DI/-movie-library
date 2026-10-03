import { createServer } from 'node:http'
import { DatabaseSync } from 'node:sqlite'
import { randomBytes, scrypt, timingSafeEqual, createHash } from 'node:crypto'
import { promisify } from 'node:util'
import { mkdirSync, existsSync, statSync, createReadStream } from 'node:fs'
import { dirname, resolve, extname, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { loginSchema, registerSchema } from '../src/schemas/auth.js'
import { createMovieService, HttpError } from './movies.js'

const hashPassword = promisify(scrypt)
const root = fileURLToPath(new URL('../', import.meta.url))
const digest = (value) => createHash('sha256').update(value).digest('hex')
const newToken = () => randomBytes(32).toString('hex')
const week = 7 * 24 * 60 * 60 * 1000

export function createApp({
  databasePath = process.env.DATABASE_PATH ||
    resolve(root, 'data/cineshelf.sqlite'),
  movieService = createMovieService(
    process.env.TMDB_READ_TOKEN,
    process.env.TMDB_API_KEY,
  ),
} = {}) {
  if (databasePath !== ':memory:')
    mkdirSync(dirname(databasePath), { recursive: true })
  const db = new DatabaseSync(databasePath)
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, salt TEXT NOT NULL, share_token TEXT UNIQUE NOT NULL, sharing INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS favorites (user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, movie_id INTEGER NOT NULL, movie TEXT NOT NULL, added_at INTEGER NOT NULL, PRIMARY KEY(user_id,movie_id));`)
  const attempts = new Map()
  const publicUser = (u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    shareToken: u.share_token,
    sharing: Boolean(u.sharing),
  })
  function sessionToken(req) {
    return (
      /(?:^|;\s*)cineshelf_session=([a-f0-9]{64})(?:;|$)/.exec(
        req.headers.cookie || '',
      )?.[1] || ''
    )
  }
  function getUser(req) {
    return db
      .prepare(
        'SELECT users.* FROM users JOIN sessions ON sessions.user_id=users.id WHERE sessions.token=? AND sessions.expires>?',
      )
      .get(digest(sessionToken(req)), Date.now())
  }
  function requireUser(req) {
    const user = getUser(req)
    if (!user) throw new HttpError(401, 'กรุณาเข้าสู่ระบบก่อน')
    return user
  }
  function cookie(res, token, age = week / 1000) {
    res.setHeader(
      'Set-Cookie',
      `cineshelf_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${age}${process.env.COOKIE_SECURE === 'true' ? '; Secure' : ''}`,
    )
  }
  function signIn(req, res, user) {
    db.prepare('DELETE FROM sessions WHERE expires<=? OR token=?').run(
      Date.now(),
      digest(sessionToken(req)),
    )
    const token = newToken()
    db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(
      digest(token),
      user.id,
      Date.now() + week,
    )
    cookie(res, token)
    return { user: publicUser(user) }
  }
  function library(userId) {
    return db
      .prepare(
        'SELECT movie FROM favorites WHERE user_id=? ORDER BY added_at DESC, movie_id DESC',
      )
      .all(userId)
      .map((row) => JSON.parse(row.movie))
  }
  async function body(req) {
    if (!req.headers['content-type']?.startsWith('application/json'))
      throw new HttpError(415, 'กรุณาส่งข้อมูลแบบ JSON')
    let content = ''
    for await (const chunk of req) {
      content += chunk
      if (Buffer.byteLength(content) > 16000)
        throw new HttpError(413, 'ข้อมูลมีขนาดใหญ่เกินไป')
    }
    try {
      return JSON.parse(content)
    } catch {
      throw new HttpError(400, 'ข้อมูลไม่ถูกต้อง')
    }
  }
  function validate(schema, value) {
    const result = schema.safeParse(value)
    if (!result.success)
      throw new HttpError(400, result.error.issues[0].message)
    return result.data
  }
  function rateLimit(req, auth = false) {
    const now = Date.now()
    for (const [key, value] of attempts)
      if (value.until < now) attempts.delete(key)
    const key =
      (req.socket.remoteAddress || 'local') + (auth ? ':auth' : ':api')
    const entry = attempts.get(key) || { count: 0, until: now + 60000 }
    entry.count++
    attempts.set(key, entry)
    if (entry.count > (auth ? 15 : 240))
      throw new HttpError(429, 'มีคำขอมากเกินไป กรุณารอประมาณหนึ่งนาที')
  }
  const server = createServer(async (req, res) => {
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
      if (path === '/api/auth/me' && req.method === 'GET') {
        const u = getUser(req)
        return json(200, { user: u ? publicUser(u) : null })
      }
      if (
        ['/api/auth/register', '/api/auth/login'].includes(path) &&
        req.method === 'POST'
      ) {
        rateLimit(req, true)
        const registration = path.endsWith('register')
        const values = validate(
          registration ? registerSchema : loginSchema,
          await body(req),
        )
        let user = db
          .prepare('SELECT * FROM users WHERE email=?')
          .get(values.email)
        if (registration) {
          if (user) throw new HttpError(409, 'อีเมลนี้ถูกใช้งานแล้ว')
          const salt = randomBytes(16).toString('hex')
          const hashed = await hashPassword(values.password, salt, 64)
          try {
            db.prepare(
              'INSERT INTO users(name,email,password,salt,share_token) VALUES(?,?,?,?,?)',
            ).run(
              values.name,
              values.email,
              hashed.toString('hex'),
              salt,
              newToken(),
            )
          } catch (error) {
            if (error.code?.includes('SQLITE'))
              throw new HttpError(
                409,
                'ไม่สามารถสร้างบัญชีนี้ได้ อีเมลอาจถูกใช้งานแล้ว',
              )
            throw error
          }
          user = db
            .prepare('SELECT * FROM users WHERE email=?')
            .get(values.email)
        } else {
          const hashed = await hashPassword(
            values.password,
            user?.salt || 'missing-user-salt',
            64,
          )
          if (
            !user ||
            !timingSafeEqual(hashed, Buffer.from(user.password, 'hex'))
          )
            throw new HttpError(401, 'อีเมลหรือรหัสผ่านไม่ถูกต้อง')
        }
        return json(registration ? 201 : 200, signIn(req, res, user))
      }
      if (path === '/api/auth/logout' && req.method === 'POST') {
        db.prepare('DELETE FROM sessions WHERE token=?').run(
          digest(sessionToken(req)),
        )
        cookie(res, '', 0)
        return json(200, { user: null })
      }
      if (path === '/api/library' && req.method === 'GET')
        return json(200, { movies: library(requireUser(req).id) })
      if (path === '/api/library' && req.method === 'POST') {
        const user = requireUser(req),
          values = await body(req)
        if (!Number.isSafeInteger(values?.movieId) || values.movieId < 1)
          throw new HttpError(400, 'รหัสหนังไม่ถูกต้อง')
        const movie = await movieService.detail(values.movieId)
        const saved = {
          id: movie.id,
          title: movie.title,
          poster_path: movie.poster_path,
          release_date: movie.release_date,
          vote_average: movie.vote_average,
          genre_ids: movie.genres.map((genre) => genre.id),
        }
        db.prepare('INSERT OR IGNORE INTO favorites VALUES(?,?,?,?)').run(
          user.id,
          movie.id,
          JSON.stringify(saved),
          Date.now(),
        )
        return json(200, { movies: library(user.id) })
      }
      if (/^\/api\/library\/\d+$/.test(path) && req.method === 'DELETE') {
        const user = requireUser(req)
        db.prepare('DELETE FROM favorites WHERE user_id=? AND movie_id=?').run(
          user.id,
          Number(path.split('/').at(-1)),
        )
        return json(200, { movies: library(user.id) })
      }
      if (path === '/api/sharing' && req.method === 'PATCH') {
        const user = requireUser(req),
          values = await body(req)
        if (typeof values?.enabled !== 'boolean')
          throw new HttpError(400, 'สถานะการแชร์ไม่ถูกต้อง')
        db.prepare('UPDATE users SET sharing=?,share_token=? WHERE id=?').run(
          Number(values.enabled),
          values.enabled ? user.share_token : newToken(),
          user.id,
        )
        return json(200, {
          user: publicUser(
            db.prepare('SELECT * FROM users WHERE id=?').get(user.id),
          ),
        })
      }
      if (/^\/api\/s\/[a-f0-9]{64}$/.test(path) && req.method === 'GET') {
        const user = db
          .prepare(
            'SELECT id,name FROM users WHERE share_token=? AND sharing=1',
          )
          .get(path.split('/').at(-1))
        if (!user)
          throw new HttpError(404, 'ไม่พบห้องสมุดนี้ หรือเจ้าของปิดการแชร์แล้ว')
        return json(200, { name: user.name, movies: library(user.id) })
      }
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
  })
  server.on('close', () => db.close())
  return server
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
