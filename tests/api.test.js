import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createApiHandler } from '../server/api.js'
import { createMovieService } from '../server/movies.js'

const handle = createApiHandler({ movieService: createMovieService('') })
async function request(path, { method = 'GET', ip = '1.1.1.1' } = {}) {
  const response = await handle(
    new Request('http://localhost/api' + path, {
      method,
      headers: { 'x-forwarded-for': ip },
    }),
  )
  return { status: response.status, data: await response.json(), response }
}

test('legacy account, library and share routes are gone', async () => {
  for (const [path, method] of [
    ['/auth/me', 'GET'],
    ['/auth/login', 'POST'],
    ['/library', 'GET'],
    ['/sharing', 'PATCH'],
    ['/s/' + 'a'.repeat(64), 'GET'],
  ])
    assert.equal((await request(path, { method })).status, 404, method + path)
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
  assert.equal((await request('/config')).data.mode, 'demo')
})

test('responses are JSON, uncached, with Thai error messages', async () => {
  const { response, data } = await request('/movies/0')
  assert.equal(
    response.headers.get('content-type'),
    'application/json; charset=utf-8',
  )
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.equal(data.error, 'ไม่พบหนังเรื่องนี้')
})

test('rate limit is per client IP', async () => {
  const limited = createApiHandler({
    movieService: createMovieService(''),
    limit: 2,
  })
  const call = (ip) =>
    limited(
      new Request('http://localhost/api/genres', {
        headers: { 'x-forwarded-for': ip + ', 10.0.0.1' },
      }),
    )
  assert.equal((await call('2.2.2.2')).status, 200)
  assert.equal((await call('2.2.2.2')).status, 200)
  const blocked = await call('2.2.2.2')
  assert.equal(blocked.status, 429)
  assert.equal(
    (await blocked.json()).error,
    'มีคำขอมากเกินไป กรุณารอประมาณหนึ่งนาที',
  )
  assert.equal((await call('3.3.3.3')).status, 200)
})

test('unexpected errors hide details', async () => {
  const broken = createApiHandler({
    movieService: {
      mode: 'demo',
      genres: async () => {
        throw new Error('secret token abc')
      },
    },
  })
  const response = await broken(new Request('http://localhost/api/genres'))
  assert.equal(response.status, 500)
  assert.deepEqual(await response.json(), {
    error: 'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง',
  })
})
