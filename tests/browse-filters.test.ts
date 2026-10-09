import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createTmdbService } from '../src/services/tmdb.ts'
import { createMovieService } from '../server/movies.js'
import { api } from '../src/lib/api.js'

test('combined discovery filters reach TMDB and preserve pagination', async () => {
  let called: URL | undefined
  const service = createTmdbService('test-token', async (input) => {
    called = new URL(String(input))
    return Response.json({
      results: [],
      page: 2,
      total_pages: 3,
      total_results: 50,
    })
  })
  await service.browse(
    new URLSearchParams({
      genre: '16',
      year: '2001',
      language: 'ja',
      sort: 'newest',
      page: '2',
    }),
  )
  assert.equal(called?.pathname, '/3/discover/movie')
  for (const [key, value] of Object.entries({
    with_genres: '16',
    primary_release_year: '2001',
    with_original_language: 'ja',
    sort_by: 'primary_release_date.desc',
    page: '2',
  }))
    assert.equal(called?.searchParams.get(key), value)
  assert.equal(called?.searchParams.has('vote_count.gte'), false)
})

test('demo filters combine, sort by release date and reject malformed input', async () => {
  const service = createMovieService('')
  const result = await service.list(
    new URLSearchParams({ genre: '16', year: '2001' }),
  )
  assert.ok(result.results.length > 0)
  assert.ok(
    result.results.every(
      (movie) =>
        movie.genre_ids.includes(16) && movie.release_date.startsWith('2001'),
    ),
  )
  const japanese = await service.list(new URLSearchParams({ language: 'ja' }))
  assert.deepEqual(
    japanese.results.map((movie) => movie.id),
    [129],
  )
  const english = await service.list(new URLSearchParams({ language: 'en' }))
  assert.ok(english.results.length > 0)
  assert.ok(english.results.every((movie) => movie.original_language === 'en'))
  const sorted = await service.list(new URLSearchParams({ sort: 'newest' }))
  assert.deepEqual(
    sorted.results.map((m) => m.release_date),
    sorted.results
      .map((m) => m.release_date)
      .sort()
      .reverse(),
  )
  await assert.rejects(service.list(new URLSearchParams({ year: 'bad' })), {
    status: 400,
  })
  await assert.rejects(service.list(new URLSearchParams({ language: '../' })), {
    status: 400,
  })
})

test('non-JSON API responses show a useful error instead of a JSON syntax error', async (t) => {
  t.mock.method(
    globalThis,
    'fetch',
    async () => new Response('<html>unavailable</html>', { status: 502 }),
  )
  await assert.rejects(api('/api/movies'), /API server/)
})
