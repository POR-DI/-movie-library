import { describe, test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const skip =
  !(url && anonKey && serviceKey) &&
  'ยังไม่ได้ตรวจ RLS: ตั้ง NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY ใน .env'
const opts = { auth: { persistSession: false, autoRefreshToken: false } }

describe('Supabase RLS', { skip }, () => {
  const admin = skip ? null : createClient(url, serviceKey, opts)
  const run = Date.now().toString(36)
  const password = 'rls-test-password-123'
  const created = []
  const users = {}
  const anon = () => createClient(url, anonKey, opts)

  async function makeUser(tag) {
    const email = `rls-${tag}-${run}@example.com`
    const username = `rls_${tag}_${run}`
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username, display_name: 'RLS ' + tag },
    })
    assert.ifError(error)
    created.push(data.user.id)
    const client = anon()
    const signIn = await client.auth.signInWithPassword({ email, password })
    assert.ifError(signIn.error)
    return { id: data.user.id, username, client }
  }
  const setPublic = async (value) => {
    const { error } = await users.a.client
      .from('profiles')
      .update({ is_public: value })
      .eq('id', users.a.id)
    assert.ifError(error)
  }
  const itemsOfA = async (client) => {
    const { data, error } = await client
      .from('library_items')
      .select('tmdb_movie_id, kind')
      .eq('user_id', users.a.id)
      .order('tmdb_movie_id')
    assert.ifError(error)
    return data
  }
  const profileOfA = async (client) => {
    const { data, error } = await client
      .from('profiles')
      .select('id, display_name, is_public')
      .eq('username', users.a.username)
    assert.ifError(error)
    return data
  }

  before(async () => {
    users.a = await makeUser('a')
    users.b = await makeUser('b')
    const { error } = await users.a.client.from('library_items').insert([
      {
        user_id: users.a.id,
        tmdb_movie_id: 157336,
        kind: 'liked',
        title: 'Interstellar',
        poster_path: null,
      },
      {
        user_id: users.a.id,
        tmdb_movie_id: 27205,
        kind: 'watchlist',
        title: 'Inception',
        poster_path: null,
      },
    ])
    assert.ifError(error)
  })
  after(async () => {
    for (const id of created) await admin.auth.admin.deleteUser(id)
  })

  test('trigger creates a private profile from signup metadata', async () => {
    const [profile] = await profileOfA(users.a.client)
    assert.equal(profile.display_name, 'RLS a')
    assert.equal(profile.is_public, false)
  })

  test('private: other users and guests see neither profile nor items', async () => {
    await setPublic(false)
    for (const client of [users.b.client, anon()]) {
      assert.deepEqual(await profileOfA(client), [])
      assert.deepEqual(await itemsOfA(client), [])
    }
  })

  test('owner sees own private profile and both kinds', async () => {
    await setPublic(false)
    assert.equal((await profileOfA(users.a.client)).length, 1)
    assert.deepEqual(await itemsOfA(users.a.client), [
      { tmdb_movie_id: 27205, kind: 'watchlist' },
      { tmdb_movie_id: 157336, kind: 'liked' },
    ])
  })

  test('public: others see profile and liked only, never watchlist', async () => {
    await setPublic(true)
    for (const client of [users.b.client, anon()]) {
      assert.equal((await profileOfA(client)).length, 1)
      assert.deepEqual(await itemsOfA(client), [
        { tmdb_movie_id: 157336, kind: 'liked' },
      ])
    }
  })

  test('switching back to private takes effect immediately', async () => {
    await setPublic(true)
    await setPublic(false)
    assert.deepEqual(await itemsOfA(anon()), [])
  })

  test('B cannot insert, delete or update data of A', async () => {
    await setPublic(true)
    const insert = await users.b.client.from('library_items').insert({
      user_id: users.a.id,
      tmdb_movie_id: 1,
      kind: 'liked',
      title: 'Injected',
      poster_path: null,
    })
    assert.equal(insert.error?.code, '42501')
    await users.b.client
      .from('library_items')
      .delete()
      .eq('user_id', users.a.id)
    await users.b.client
      .from('profiles')
      .update({ display_name: 'hacked', is_public: false })
      .eq('id', users.a.id)
    assert.equal((await itemsOfA(users.a.client)).length, 2)
    const [profile] = await profileOfA(users.a.client)
    assert.equal(profile.display_name, 'RLS a')
    assert.equal(profile.is_public, true)
  })

  test('owner cannot change id or created_at of own profile', async () => {
    const { error } = await users.a.client
      .from('profiles')
      .update({ created_at: '2000-01-01T00:00:00Z' })
      .eq('id', users.a.id)
    assert.equal(error?.code, '42501')
  })

  test('username_available reflects taken names, case-insensitively', async () => {
    const taken = await anon().rpc('username_available', {
      name: users.a.username.toUpperCase(),
    })
    assert.ifError(taken.error)
    assert.equal(taken.data, false)
    const free = await anon().rpc('username_available', {
      name: 'free_' + run,
    })
    assert.equal(free.data, true)
  })

  test('signup with a taken username fails with the message we map', async () => {
    const { data, error } = await anon().auth.signUp({
      email: `rls-dup-${run}@example.com`,
      password,
      options: {
        data: { username: users.a.username, display_name: 'dup' },
      },
    })
    if (data?.user) created.push(data.user.id)
    assert.match(error?.message || '', /Database error saving new user/i)
  })
})
