import test from 'node:test'
import assert from 'node:assert/strict'
import { LruCache } from '../src/lib/lruCache.ts'

test('LRU preserves frequently read entries and replaces existing keys', () => {
  const cache = new LruCache<string, number>(2, 100)
  cache.set('a', 1)
  cache.set('b', 2)
  assert.equal(cache.get('a'), 1)
  cache.set('c', 3)
  assert.equal(cache.get('b'), undefined)
  cache.set('a', 4)
  assert.equal(cache.get('c'), 3)
  assert.equal(cache.get('a'), 4)
  cache.clear()
  assert.equal(cache.get('a'), undefined)
})

test('TTL expires at boundary without extending on reads', () => {
  let time = 0
  const cache = new LruCache<string, number>(2, 10, () => time)
  cache.set('a', 1)
  time = 9
  assert.equal(cache.get('a'), 1)
  time = 10
  assert.equal(cache.get('a'), undefined)
  assert.throws(() => new LruCache(0, 10), RangeError)
  assert.throws(() => new LruCache(1, -1), RangeError)
})
