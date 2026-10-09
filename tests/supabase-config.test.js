import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readSupabaseConfig } from '../src/lib/supabaseConfig.js'

test('returns null when either variable is missing or blank', () => {
  assert.equal(readSupabaseConfig({}), null)
  assert.equal(
    readSupabaseConfig({ NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co' }),
    null,
  )
  assert.equal(
    readSupabaseConfig({
      NEXT_PUBLIC_SUPABASE_URL: ' ',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'k',
    }),
    null,
  )
})

test('returns trimmed values when both are set', () => {
  assert.deepEqual(
    readSupabaseConfig({
      NEXT_PUBLIC_SUPABASE_URL: ' https://x.supabase.co ',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ' key ',
    }),
    { url: 'https://x.supabase.co', anonKey: 'key' },
  )
})

test('returns null for a URL that createClient would reject', () => {
  for (const url of ['xxxx.supabase.co', 'ftp://x.supabase.co', 'not a url'])
    assert.equal(
      readSupabaseConfig({
        NEXT_PUBLIC_SUPABASE_URL: url,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'k',
      }),
      null,
      url,
    )
})
