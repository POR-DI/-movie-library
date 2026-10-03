import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeUsername,
  usernameSchema,
  registerSchema,
  profileSchema,
} from '../src/schemas/auth.js'

const valid = {
  email: 'Me@Example.com',
  password: 'password-123',
  confirmPassword: 'password-123',
  username: '  Por_01 ',
  displayName: ' พอ ',
}

test('normalizeUsername trims and lowercases (URL /u/Por_01 works)', () => {
  assert.equal(normalizeUsername('  Por_01 '), 'por_01')
})

test('username must match ^[a-z0-9_]{3,20}$ after normalizing', () => {
  for (const ok of ['abc', 'por_01', 'A_B_C', 'x'.repeat(20)])
    assert.equal(usernameSchema.safeParse(ok).success, true, ok)
  for (const bad of ['ab', 'x'.repeat(21), 'พอ', 'por-01', 'por 01', ''])
    assert.equal(usernameSchema.safeParse(bad).success, false, bad)
})

test('registerSchema normalizes and checks password confirmation', () => {
  const parsed = registerSchema.parse(valid)
  assert.equal(parsed.email, 'me@example.com')
  assert.equal(parsed.username, 'por_01')
  assert.equal(parsed.displayName, 'พอ')
  const mismatch = registerSchema.safeParse({
    ...valid,
    confirmPassword: 'nope-nope',
  })
  assert.equal(mismatch.success, false)
  assert.equal(mismatch.error.issues[0].message, 'รหัสผ่านไม่ตรงกัน')
})

test('displayName is 1-50 characters after trimming', () => {
  assert.equal(
    profileSchema.safeParse({ username: 'abc', displayName: '   ' }).success,
    false,
  )
  assert.equal(
    profileSchema.safeParse({ username: 'abc', displayName: 'ก'.repeat(51) })
      .success,
    false,
  )
  assert.equal(
    profileSchema.safeParse({ username: 'abc', displayName: 'ก' }).success,
    true,
  )
})
