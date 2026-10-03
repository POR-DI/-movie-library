import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createApp } from '../server/index.js'
import { createMovieService } from '../server/movies.js'

let server, origin
before(async () => {
  server = createApp({ movieService: createMovieService('') })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  origin = 'http://127.0.0.1:' + server.address().port
})
after(async () => {
  await new Promise((resolve) => server.close(resolve))
})
async function request(
  path,
  { method = 'GET', body, cookie, external = false } = {},
) {
  const response = await fetch(origin + '/api' + path, {
    method,
    headers: {
      Origin: external ? 'https://untrusted.example' : origin,
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
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
