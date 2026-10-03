import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  idsOf,
  applyToggle,
  revertToggle,
  itemToMovie,
} from '../src/lib/library.js'

const interstellar = { id: 157336, title: 'Interstellar', poster_path: '/a.jpg' }
const inception = { id: 27205, title: 'Inception', poster_path: null }

test('idsOf separates liked and watchlist', () => {
  const items = [
    { tmdb_movie_id: 1, kind: 'liked' },
    { tmdb_movie_id: 2, kind: 'watchlist' },
    { tmdb_movie_id: 3, kind: 'liked' },
  ]
  assert.deepEqual([...idsOf(items, 'liked')], [1, 3])
  assert.deepEqual([...idsOf(items, 'watchlist')], [2])
})

test('applyToggle inserts newest first with row for Supabase', () => {
  const result = applyToggle([], interstellar, 'liked', 'u1')
  assert.equal(result.action, 'insert')
  assert.deepEqual(result.row, {
    user_id: 'u1',
    tmdb_movie_id: 157336,
    kind: 'liked',
    title: 'Interstellar',
    poster_path: '/a.jpg',
  })
  assert.equal(result.items[0].tmdb_movie_id, 157336)
  assert.equal(typeof result.items[0].created_at, 'string')
})

test('applyToggle deletes only the matching kind', () => {
  const liked = applyToggle([], interstellar, 'liked', 'u1').items
  const both = applyToggle(liked, interstellar, 'watchlist', 'u1').items
  const result = applyToggle(both, interstellar, 'liked', 'u1')
  assert.equal(result.action, 'delete')
  assert.deepEqual(result.row, {
    user_id: 'u1',
    tmdb_movie_id: 157336,
    kind: 'liked',
  })
  assert.deepEqual([...idsOf(result.items, 'watchlist')], [157336])
  assert.deepEqual([...idsOf(result.items, 'liked')], [])
})

test('revert of insert removes only that item', () => {
  const first = applyToggle([], interstellar, 'liked', 'u1')
  const second = applyToggle(first.items, inception, 'liked', 'u1')
  // first insert failed after second succeeded
  const reverted = revertToggle(second.items, first)
  assert.deepEqual([...idsOf(reverted, 'liked')], [27205])
})

test('revert does not clobber concurrent toggle', () => {
  const start = applyToggle([], interstellar, 'liked', 'u1').items
  const removing = applyToggle(start, interstellar, 'liked', 'u1')
  const adding = applyToggle(removing.items, inception, 'liked', 'u1')
  // delete of Interstellar failed; Inception insert must survive
  const reverted = revertToggle(adding.items, removing)
  assert.deepEqual(
    [...idsOf(reverted, 'liked')].sort((a, b) => a - b),
    [27205, 157336],
  )
})

test('revert of delete does not duplicate an item already present', () => {
  const start = applyToggle([], interstellar, 'liked', 'u1').items
  const removing = applyToggle(start, interstellar, 'liked', 'u1')
  const reverted = revertToggle(start, removing)
  assert.equal(reverted.length, 1)
})

test('itemToMovie maps a stored row to MovieCard shape', () => {
  assert.deepEqual(
    itemToMovie({
      tmdb_movie_id: 5,
      kind: 'liked',
      title: 'X',
      poster_path: null,
      created_at: '',
    }),
    { id: 5, title: 'X', poster_path: null },
  )
})
