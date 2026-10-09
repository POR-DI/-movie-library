import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createApiHandler } from '../server/api.js'
import { createMovieService } from '../server/movies.js'
const handler = createApiHandler({ movieService: createMovieService('') })
const origin = 'http://localhost:5175'
async function request(
  path,
  { method = 'GET', body, cookie, external = false } = {},
) {
  const response = await handler(
    new Request(origin + '/api' + path, {
      method,
      headers: {
        Origin: external ? 'https://untrusted.example' : origin,
        'Content-Type': 'application/json',
        ...(cookie ? { Cookie: cookie } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),
  )
  return {
    status: response.status,
    data: await response.json(),
    cookie: response.headers.get('set-cookie')?.split(';')[0],
    headers: response.headers,
  }
}
test('legacy account, library and share routes are gone', async () => {
  for (const [path, method] of [
    ['/auth/me', 'GET'],
    ['/auth/login', 'POST'],
    ['/library', 'GET'],
    ['/sharing', 'PATCH'],
    ['/s/' + 'a'.repeat(64), 'GET'],
  ])
    assert.equal(
      (await request(path, method === 'GET' ? {} : { method, body: {} }))
        .status,
      404,
      method + ' ' + path,
    )
})

test('sample search, filters, sorting, detail and invalid IDs', async () => {
  const search = await request('/movies?q=INTER')
  assert.equal(search.data.mode, 'demo')
  assert.equal(search.data.results[0].id, 157336)
  const genre = await request('/movies?genre=16&sort=rating')
  assert.ok(genre.data.results.every((movie) => movie.genre_ids.includes(16)))
  assert.ok(
    genre.data.results[0].vote_average >= genre.data.results[1].vote_average,
  )
  assert.equal((await request('/movies?q=no-such-film')).data.results.length, 0)
  assert.equal((await request('/movies/157336')).data.runtime, 169)
  assert.equal((await request('/movies/invalid')).status, 404)
  assert.equal((await request('/movies/0')).status, 404)
  assert.ok((await request('/genres')).data.genres.length > 5)
})

test('Next route exports serve the same movie API without a separate server', async () => {
  const routes = await import('../src/app/api/[...path]/route.js')
  assert.equal(routes.runtime, 'nodejs')
  const response = await routes.GET(new Request(origin + '/api/config'))
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  const data = await response.json()
  assert.deepEqual(Object.keys(data), ['mode'])
  assert.ok(['demo', 'tmdb'].includes(data.mode))
  assert.equal(
    (
      await routes.POST(
        new Request(origin + '/api/auth/login', { method: 'POST' }),
      )
    ).status,
    404,
  )
})

test('API returns safe JSON errors and resets the request budget', async () => {
  let time = 0
  const limited = createApiHandler({
    movieService: createMovieService(''),
    now: () => time,
    limit: 1,
    clientIdentity: (request) => request.headers.get('x-test-client') || 'a',
  })
  assert.equal((await limited(new Request(origin + '/api/config'))).status, 200)
  const blocked = await limited(new Request(origin + '/api/config'))
  assert.equal(blocked.status, 429)
  assert.ok((await blocked.json()).error)
  assert.equal(
    (
      await limited(
        new Request(origin + '/api/config', {
          headers: { 'x-test-client': 'b' },
        }),
      )
    ).status,
    200,
  )
  time = 60000
  assert.equal((await limited(new Request(origin + '/api/config'))).status, 200)
  const failed = createApiHandler({
    movieService: {
      genres: () => {
        throw new Error('private backend details')
      },
    },
  })
  const response = await failed(new Request(origin + '/api/genres'))
  assert.equal(response.status, 500)
  assert.equal((await response.json()).error, 'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง')
})
