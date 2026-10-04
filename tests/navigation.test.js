import { test } from 'node:test'
import assert from 'node:assert/strict'
import { moviesHref, safeNext } from '../src/lib/navigation.js'

test('safeNext keeps same-site paths with query and hash', () => {
  assert.equal(safeNext('/movies/157336'), '/movies/157336')
  assert.equal(safeNext('/movies?q=inter#top'), '/movies?q=inter#top')
  assert.equal(safeNext(null), '/library')
})

test('safeNext rejects anything that leaves the site', () => {
  for (const next of [
    '//evil.com',
    '/\t/evil.com',
    '/\n/evil.com',
    '/\\evil.com',
    '\\\\evil.com',
    'https://evil.com',
    'evil.com',
    'javascript:alert(1)',
  ])
    assert.equal(safeNext(next), '/library', JSON.stringify(next))
})

test('safeNext never sends you back to login or register', () => {
  for (const next of ['/login', '/register?next=/x', '/login/', '/register#a'])
    assert.equal(safeNext(next), '/library', next)
})

test('moviesHref works without URLSearchParams.size (Safari 16)', () => {
  const params = new URLSearchParams({ q: 'inter' })
  Object.defineProperty(params, 'size', { value: undefined })
  assert.equal(moviesHref(params), '/movies?q=inter')
  assert.equal(moviesHref(new URLSearchParams()), '/movies')
})
