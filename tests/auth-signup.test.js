import { test } from 'node:test'
import { randomUUID } from 'node:crypto'
import assert from 'node:assert/strict'
import { signUpAccount } from '../src/lib/auth.js'
const values = {
  email: 'qa@example.com',
  password: randomUUID(),
  username: 'qa',
  displayName: 'QA',
}
test('signup accepts both immediate session and confirmation-pending success', async () => {
  for (const session of [null, { access_token: 'fixture' }]) {
    let sent
    const client = {
      auth: {
        signUp: async (args) => {
          sent = args
          return { data: { session }, error: null }
        },
      },
    }
    const result = await signUpAccount(
      client,
      values,
      'http://localhost:5175/login',
    )
    assert.equal(result.confirmationRequired, !session)
    assert.deepEqual(sent.options.data, { username: 'qa', display_name: 'QA' })
    assert.equal(sent.options.emailRedirectTo, 'http://localhost:5175/login')
  }
})
test('rejected signup remains an error, not a confirmation success', async () => {
  const client = {
    auth: {
      signUp: async () => ({
        data: { session: null },
        error: { code: 'email_address_invalid' },
      }),
    },
  }
  await assert.rejects(
    () => signUpAccount(client, values),
    /ระบบไม่ยอมรับอีเมลนี้/,
  )
})
