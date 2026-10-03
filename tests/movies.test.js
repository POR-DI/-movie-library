import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createMovieService } from '../server/movies.js'

test('v3 API key works without a bearer token and remains out of responses', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url.searchParams.get('api_key'), 'unit-api-key')
    assert.equal(options.headers.Authorization, undefined)
    return Response.json({ results: [], total_pages: 1, total_results: 0, page: 1 })
  })
  const service = createMovieService('', 'unit-api-key')
  const result = await service.list(new URLSearchParams())
  assert.equal(result.mode, 'tmdb')
  assert.ok(!JSON.stringify(result).includes('unit-api-key'))
})

test('TMDB adapter passes server-side token, search and discovery parameters correctly', async (t) => {
  const calls = []
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options })
    return Response.json({
      results: [],
      total_pages: 900,
      total_results: 0,
      page: 1,
    })
  })
  const service = createMovieService('test-token-not-a-real-secret')
  const search = await service.list(
    new URLSearchParams({ q: 'Arrival', page: '2' }),
  )
  assert.equal(calls[0].url.pathname, '/3/search/movie')
  assert.equal(calls[0].url.searchParams.get('query'), 'Arrival')
  assert.equal(calls[0].url.searchParams.get('language'), 'th-TH')
  assert.equal(calls[0].url.searchParams.get('page'), '2')
  assert.equal(
    calls[0].options.headers.Authorization,
    'Bearer test-token-not-a-real-secret',
  )
  assert.equal(search.mode, 'tmdb')
  assert.equal(search.total_pages, 500)
  assert.ok(!JSON.stringify(search).includes('test-token'))
  await service.list(new URLSearchParams({ genre: '878', sort: 'rating' }))
  assert.equal(calls[1].url.pathname, '/3/discover/movie')
  assert.equal(calls[1].url.searchParams.get('with_genres'), '878')
  assert.equal(calls[1].url.searchParams.get('sort_by'), 'vote_average.desc')
  assert.equal(calls[1].url.searchParams.get('include_adult'), 'false')
})

test('TMDB failures are surfaced instead of silently substituting sample movies', async (t) => {
  const mock = t.mock.method(
    globalThis,
    'fetch',
    async () => new Response('', { status: 401 }),
  )
  const service = createMovieService('invalid-token')
  await assert.rejects(service.detail(157336), (error) => error.status === 502)
  mock.mock.mockImplementation(async () => new Response('', { status: 404 }))
  await assert.rejects(
    service.detail(123456789),
    (error) => error.status === 404,
  )
  mock.mock.mockImplementation(async () => {
    throw new Error('Network unavailable')
  })
  await assert.rejects(
    service.list(new URLSearchParams()),
    (error) => error.status === 502,
  )
})
