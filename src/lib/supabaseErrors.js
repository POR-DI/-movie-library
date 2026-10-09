const byCode = {
  email_address_invalid:
    'ระบบไม่ยอมรับอีเมลนี้ กรุณาตรวจสอบหรือใช้อีเมลที่คุณใช้งานจริง',
  user_already_exists: 'อีเมลนี้ถูกใช้งานแล้ว',
  email_exists: 'อีเมลนี้ถูกใช้งานแล้ว',
  invalid_credentials: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
  weak_password: 'รหัสผ่านนี้คาดเดาง่ายเกินไป ลองตั้งใหม่',
  23505: 'ชื่อผู้ใช้นี้ถูกใช้แล้ว',
  42501: 'ไม่มีสิทธิ์ทำรายการนี้',
  over_request_rate_limit: 'มีคำขอมากเกินไป กรุณารอสักครู่',
}
const offline = 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่'

export function toThaiMessage(error) {
  if (!error) return ''
  if (byCode[error.code]) return byCode[error.code]
  // The signup trigger fails as a generic auth error; a username clash is the expected cause
  // because the form already validated every other column.
  if (/Database error saving new user/i.test(error.message || ''))
    return 'ชื่อผู้ใช้นี้ถูกใช้แล้ว'
  if (
    error.name === 'AuthRetryableFetchError' ||
    /Failed to fetch|NetworkError|fetch failed/i.test(error.message || '')
  )
    return offline
  return 'เกิดข้อผิดพลาด กรุณาลองใหม่'
}
