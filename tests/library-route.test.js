import test from 'node:test'
import assert from 'node:assert/strict'
import { createLibraryHandler } from '../server/library.js'
const config = {
  url: 'https://example.supabase.co',
  anonKey: 'public-test-key',
}
const payload = {
  action: 'insert',
  kind: 'liked',
  movie: { id: 157336, title: 'Interstellar', poster_path: null },
}
const request = (body = payload, token = 'valid') =>
  new Request('http://localhost/api/library', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
    body: JSON.stringify(body),
  })

test('library rejects unauthenticated, malformed and forged ownership input before writing', async () => {
  const POST = createLibraryHandler({
    config,
    clientFactory: () => {
      throw new Error('must not create client')
    },
  })
  assert.equal((await POST(request(payload, ''))).status, 401)
  assert.equal(
    (await POST(request({ ...payload, user_id: 'victim' }))).status,
    400,
  )
  assert.equal((await POST(request({ ...payload, kind: 'other' }))).status, 400)
  assert.equal(
    (await POST(request({ ...payload, movie: { ...payload.movie, id: -1 } })))
      .status,
    400,
  )
})

test('library writes only verified user identity and uses caller token with RLS', async () => {
  let row, matched, options
  const POST = createLibraryHandler({
    config,
    clientFactory: (_url, _key, opts) => {
      options = opts
      return {
        auth: {
          getUser: async (token) => {
            assert.equal(token, 'valid')
            return { data: { user: { id: 'owner' } } }
          },
        },
        from: () => ({
          upsert: async (value) => {
            row = value
            return {}
          },
          delete: () => ({
            match: async (value) => {
              matched = value
              return {}
            },
          }),
        }),
      }
    },
  })
  assert.equal((await POST(request())).status, 200)
  assert.equal(row.user_id, 'owner')
  assert.equal(options.global.headers.Authorization, 'Bearer valid')
  assert.equal(
    (await POST(request({ ...payload, action: 'delete' }))).status,
    200,
  )
  assert.deepEqual(matched, {
    user_id: 'owner',
    tmdb_movie_id: 157336,
    kind: 'liked',
  })
})

test('expired sessions and database failures return safe errors', async () => {
  const expired = createLibraryHandler({
    config,
    clientFactory: () => ({
      auth: {
        getUser: async () => ({ error: new Error('private auth details') }),
      },
    }),
  })
  assert.equal((await expired(request())).status, 401)
  const failed = createLibraryHandler({
    config,
    clientFactory: () => ({
      auth: { getUser: async () => ({ data: { user: { id: 'owner' } } }) },
      from: () => ({
        upsert: async () => ({ error: new Error('secret database error') }),
      }),
    }),
  })
  const response = await failed(request())
  assert.equal(response.status, 502)
  assert.doesNotMatch(await response.text(), /secret database/)
})
