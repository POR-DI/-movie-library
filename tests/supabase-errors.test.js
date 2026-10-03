import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toThaiMessage } from '../src/lib/supabaseErrors.js'

test('maps known Supabase errors to Thai', () => {
  const cases = [
    [{ code: 'user_already_exists' }, 'อีเมลนี้ถูกใช้งานแล้ว'],
    [{ code: 'email_exists' }, 'อีเมลนี้ถูกใช้งานแล้ว'],
    [{ code: 'invalid_credentials' }, 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'],
    [{ code: 'weak_password' }, 'รหัสผ่านนี้คาดเดาง่ายเกินไป ลองตั้งใหม่'],
    [{ code: '23505' }, 'ชื่อผู้ใช้นี้ถูกใช้แล้ว'],
    [
      { code: 'unexpected_failure', message: 'Database error saving new user' },
      'ชื่อผู้ใช้นี้ถูกใช้แล้ว',
    ],
    [{ code: '42501' }, 'ไม่มีสิทธิ์ทำรายการนี้'],
    [{ code: 'over_request_rate_limit' }, 'มีคำขอมากเกินไป กรุณารอสักครู่'],
    [
      { name: 'AuthRetryableFetchError', message: 'Failed to fetch' },
      'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่',
    ],
    [
      new TypeError('Failed to fetch'),
      'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่',
    ],
  ]
  for (const [error, expected] of cases)
    assert.equal(toThaiMessage(error), expected, JSON.stringify(error))
})

test('unknown errors get a generic message, never raw English', () => {
  assert.equal(
    toThaiMessage({ code: 'something_new', message: 'Boom' }),
    'เกิดข้อผิดพลาด กรุณาลองใหม่',
  )
  assert.equal(toThaiMessage(null), '')
})
