import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  createTmdbService,
  getPosterUrl,
  getBackdropUrl,
  selectTrailer,
} from '../src/services/tmdb.ts'
import {
  emptyPortfolio,
  importLegacy,
  personalMovie,
  readPortfolio,
  storageKey,
  writePortfolio,
} from '../src/storage/portfolio.ts'
import type { MovieDetails, Video } from '../src/types/tmdb.ts'
const page = { page: 1, total_pages: 1, total_results: 0, results: [] }
const video = (id: string, official: boolean, type = 'Trailer'): Video => ({
  id,
  key: id,
  official,
  type,
  site: 'YouTube',
  name: id,
  iso_639_1: 'en',
})
const movie: MovieDetails = {
  id: 1,
  title: 'ชื่อไทย',
  original_title: 'Original',
  overview: '',
  release_date: '2020-01-01',
  poster_path: null,
  backdrop_path: null,
  vote_average: 7,
  vote_count: 5,
  popularity: 10,
  original_language: 'en',
  genres: [],
  runtime: 90,
  production_companies: [],
  production_countries: [],
  videos: { results: [video('unofficial', false)] },
}

test('all five collections, search trim, empty query, bearer headers and localization', async () => {
  const calls: URL[] = []
  const service = createTmdbService('unit-placeholder', async (input, init) => {
    const url = new URL(String(input))
    calls.push(url)
    assert.equal(new Headers(init?.headers).get('Accept'), 'application/json')
    assert.equal(
      new Headers(init?.headers).get('Authorization'),
      'Bearer unit-placeholder',
    )
    assert.equal(url.searchParams.get('language'), 'th-TH')
    assert.equal(url.searchParams.get('region'), 'TH')
    return Response.json(page)
  })
  await Promise.all([
    service.getTrendingMovies(),
    service.getPopularMovies(),
    service.getTopRatedMovies(),
    service.getNowPlayingMovies(),
    service.getUpcomingMovies(),
    service.searchMovies('  ชื่อไทย  '),
  ])
  assert.deepEqual(
    calls.map((u) => u.pathname),
    [
      '/3/trending/movie/week',
      '/3/movie/popular',
      '/3/movie/top_rated',
      '/3/movie/now_playing',
      '/3/movie/upcoming',
      '/3/search/movie',
    ],
  )
  assert.equal(calls.at(-1)?.searchParams.get('query'), 'ชื่อไทย')
  assert.deepEqual(await service.searchMovies('   '), {
    ...page,
    total_pages: 0,
  })
  assert.equal(calls.length, 6)
})
test('deduplicates concurrent requests, caches success, expires and retries failures', async () => {
  let calls = 0
  const service = createTmdbService(
    'unit-placeholder',
    async () => {
      calls++
      await new Promise((r) => setTimeout(r, 5))
      return Response.json(page)
    },
    20,
  )
  await Promise.all([service.getPopularMovies(), service.getPopularMovies()])
  await service.getPopularMovies()
  assert.equal(calls, 1)
  await new Promise((r) => setTimeout(r, 25))
  await service.getPopularMovies()
  assert.equal(calls, 2)
  let fail = true
  const retry = createTmdbService('unit-placeholder', async () => {
    if (fail) throw new Error('private error')
    return Response.json(page)
  })
  await assert.rejects(retry.getPopularMovies(), /เชื่อมต่อ TMDB/)
  fail = false
  assert.deepEqual(await retry.getPopularMovies(), page)
})
test('Thai overview fallback preserves Thai title/original title and appends all details', async () => {
  const calls: URL[] = []
  const service = createTmdbService('unit-placeholder', async (input) => {
    const url = new URL(String(input))
    calls.push(url)
    return Response.json(
      url.searchParams.get('language') === 'en-US'
        ? {
            ...movie,
            title: 'English',
            overview: 'English overview',
            videos: { results: [video('official', true)] },
          }
        : movie,
    )
  })
  const result = await service.getMovieDetails(1)
  assert.equal(
    calls[0].searchParams.get('append_to_response'),
    'credits,videos,images,recommendations,similar',
  )
  assert.equal(result.title, 'ชื่อไทย')
  assert.equal(result.original_title, 'Original')
  assert.equal(result.overview, 'English overview')
  assert.equal(result.overviewLanguage, 'en-US')
  assert.equal(selectTrailer(result.videos?.results)?.id, 'official')
  const thai = createTmdbService('unit-placeholder', async () =>
    Response.json({ ...movie, overview: 'เรื่องย่อไทย' }),
  )
  assert.equal((await thai.getMovieDetails(1)).overview, 'เรื่องย่อไทย')
})
test('failed English fallback keeps usable Thai detail and can be retried', async () => {
  let fail = true
  const service = createTmdbService('unit-placeholder', async (input) => {
    if (new URL(String(input)).searchParams.get('language') === 'en-US') {
      if (fail) throw new Error('offline')
      return Response.json({ ...movie, overview: 'Recovered overview' })
    }
    return Response.json(movie)
  })
  assert.equal((await service.getMovieDetails(1)).fallbackUnavailable, true)
  fail = false
  assert.equal(
    (await service.getMovieDetails(1)).overview,
    'Recovered overview',
  )
})
test('safe errors for missing token, HTTP, TMDB, malformed JSON and network failures', async () => {
  await assert.rejects(
    createTmdbService('').getPopularMovies(),
    /TMDB_API_KEY/,
  )
  for (const status of [401, 403, 404, 429, 500]) {
    const service = createTmdbService(
      'unit-placeholder',
      async () => new Response('must-not-leak', { status }),
    )
    await assert.rejects(
      service.getPopularMovies(),
      (error) =>
        error instanceof Error && !error.message.includes('must-not-leak'),
    )
  }
  for (const response of [
    Response.json({ success: false, status_message: 'must-not-leak' }),
    new Response('not-json'),
  ]) {
    await assert.rejects(
      createTmdbService(
        'unit-placeholder',
        async () => response,
      ).getPopularMovies(),
    )
  }
  await assert.rejects(
    createTmdbService('unit-placeholder').getMovieDetails('../bad'),
    /ไม่พบ/,
  )
})
test('safe image helpers and official trailer priority with video fallback', () => {
  assert.equal(getPosterUrl(null), null)
  assert.equal(getBackdropUrl(undefined), null)
  assert.equal(
    getPosterUrl('/poster.jpg'),
    'https://image.tmdb.org/t/p/w500/poster.jpg',
  )
  assert.equal(
    getBackdropUrl('/backdrop.jpg'),
    'https://image.tmdb.org/t/p/original/backdrop.jpg',
  )
  assert.equal(
    selectTrailer([
      video('clip', true, 'Clip'),
      video('unofficial', false),
      video('official', true),
    ])?.id,
    'official',
  )
  assert.equal(selectTrailer([video('clip', true, 'Clip')])?.id, 'clip')
  assert.equal(selectTrailer([video('unsafe?url', true)]), undefined)
})
test('personal storage preserves other keys and reloads only IDs and personal fields', () => {
  const values = new Map([['legacy-user-key', 'preserve-me']])
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
  }
  const data = emptyPortfolio()
  data.movies = [
    {
      ...personalMovie(27205),
      status: 'watched',
      favorite: true,
      rating: 9,
      review: 'Loved it',
      watchedAt: '2026-09-25',
      playlistIds: ['nolan'],
    },
  ]
  data.playlists = [{ id: 'nolan', name: 'Nolan' }]
  writePortfolio(storage, 'guest', data)
  assert.deepEqual(readPortfolio(storage, 'guest'), data)
  assert.equal(values.get('legacy-user-key'), 'preserve-me')
  assert.equal(values.get(storageKey('guest'))?.includes('poster_path'), false)
  assert.equal(readPortfolio(storage, 'other-user').movies.length, 0)
  values.set(storageKey('broken'), 'broken-json')
  assert.throws(() => readPortfolio(storage, 'broken'))
  assert.equal(values.get(storageKey('broken')), 'broken-json')
  assert.throws(
    () =>
      writePortfolio(
        {
          setItem: () => {
            throw new Error('QuotaExceeded')
          },
        },
        'guest',
        data,
      ),
    /บันทึกในเครื่องไม่ได้/,
  )
})
test('legacy import preserves reviews/removals and is idempotent', () => {
  const data = emptyPortfolio()
  data.movies = [{ ...personalMovie(1), review: 'Keep review' }]
  data.removedIds = [2]
  const imported = importLegacy(data, [1, 2, 3])
  assert.deepEqual(
    imported.movies.map((m) => m.tmdbMovieId),
    [1, 3],
  )
  assert.equal(imported.movies[0].review, 'Keep review')
  assert.equal(importLegacy(imported, [4]), imported)
})
