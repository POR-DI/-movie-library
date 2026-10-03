import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createApp } from '../server/index.js'
import { createMovieService } from '../server/movies.js'

let server, origin
before(async () => {
  server = createApp({
    databasePath: ':memory:',
    movieService: createMovieService(''),
  })
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
const account = (email) => ({
  name: 'Movie Lover',
  email,
  password: 'test-password-123',
  confirmPassword: 'test-password-123',
})

test('registration, authentication, private library, public read-only sharing, revocation and logout', async () => {
  assert.equal((await request('/library')).status, 401)
  const invalid = await request('/auth/register', {
    method: 'POST',
    body: { ...account('bad@example.com'), confirmPassword: 'wrong' },
  })
  assert.equal(invalid.status, 400)
  const first = await request('/auth/register', {
    method: 'POST',
    body: account('owner@example.com'),
  })
  assert.equal(first.status, 201)
  assert.match(first.headers.get('set-cookie'), /HttpOnly/)
  assert.match(first.headers.get('set-cookie'), /SameSite=Lax/)
  assert.equal(first.data.user.sharing, false)
  assert.equal(first.data.user.password, undefined)
  const cookie = first.cookie
  assert.equal(
    (await request('/auth/me', { cookie })).data.user.name,
    'Movie Lover',
  )
  assert.equal(
    (
      await request('/auth/register', {
        method: 'POST',
        body: account('OWNER@example.com'),
      })
    ).status,
    409,
  )
  assert.equal(
    (
      await request('/auth/login', {
        method: 'POST',
        body: { email: 'owner@example.com', password: 'wrong-password' },
      })
    ).status,
    401,
  )
  assert.equal((await request('/s/' + first.data.user.shareToken)).status, 404)
  const added = await request('/library', {
    method: 'POST',
    cookie,
    body: { movieId: 157336 },
  })
  assert.equal(added.status, 200)
  assert.equal(added.data.movies[0].title, 'Interstellar')
  const duplicate = await request('/library', {
    method: 'POST',
    cookie,
    body: { movieId: 157336 },
  })
  assert.equal(duplicate.data.movies.length, 1)
  assert.equal(
    (
      await request('/library', {
        method: 'POST',
        cookie,
        body: { movieId: 99999999 },
      })
    ).status,
    404,
  )
  assert.equal(
    (
      await request('/library', {
        method: 'POST',
        cookie,
        body: { movieId: '<script>' },
      })
    ).status,
    400,
  )
  assert.equal((await request('/library', { cookie })).data.movies.length, 1)
  const second = await request('/auth/register', {
    method: 'POST',
    body: account('friend@example.com'),
  })
  assert.equal(
    (await request('/library', { cookie: second.cookie })).data.movies.length,
    0,
  )
  await request('/library/157336', { method: 'DELETE', cookie: second.cookie })
  assert.equal((await request('/library', { cookie })).data.movies.length, 1)
  const shared = await request('/sharing', {
    method: 'PATCH',
    cookie,
    body: { enabled: true },
  })
  const sharePath = '/s/' + shared.data.user.shareToken
  const publicShelf = await request(sharePath)
  assert.equal(publicShelf.status, 200)
  assert.deepEqual(Object.keys(publicShelf.data).sort(), ['movies', 'name'])
  assert.equal(publicShelf.data.movies.length, 1)
  assert.equal((await request(sharePath, { method: 'DELETE' })).status, 404)
  assert.equal(
    (
      await request('/sharing', {
        method: 'PATCH',
        cookie,
        external: true,
        body: { enabled: false },
      })
    ).status,
    403,
  )
  await request('/library', {
    method: 'POST',
    cookie,
    body: { movieId: 27205 },
  })
  assert.equal((await request(sharePath)).data.movies.length, 2)
  await request('/sharing', {
    method: 'PATCH',
    cookie,
    body: { enabled: false },
  })
  assert.equal((await request(sharePath)).status, 404)
  const reshared = await request('/sharing', {
    method: 'PATCH',
    cookie,
    body: { enabled: true },
  })
  assert.notEqual(reshared.data.user.shareToken, shared.data.user.shareToken)
  assert.equal((await request(sharePath)).status, 404)
  await request('/library/157336', { method: 'DELETE', cookie })
  assert.equal((await request('/library', { cookie })).data.movies.length, 1)
  await request('/auth/logout', { method: 'POST', cookie })
  assert.equal((await request('/library', { cookie })).status, 401)
  const loggedIn = await request('/auth/login', {
    method: 'POST',
    body: { email: 'owner@example.com', password: 'test-password-123' },
  })
  assert.equal(loggedIn.status, 200)
  assert.equal(
    (await request('/library', { cookie: loggedIn.cookie })).data.movies[0].id,
    27205,
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
