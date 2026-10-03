import { z } from 'zod'
export const normalizeUsername = (value) => value.trim().toLowerCase()
export const usernameSchema = z
  .string()
  .transform(normalizeUsername)
  .pipe(
    z
      .string()
      .regex(
        /^[a-z0-9_]{3,20}$/,
        'ชื่อผู้ใช้ใช้ได้เฉพาะ a–z, 0–9 และ _ ยาว 3–20 ตัว',
      ),
  )
const displayName = z
  .string()
  .trim()
  .min(1, 'กรุณากรอกชื่อที่แสดง')
  .max(50, 'ชื่อที่แสดงไม่เกิน 50 ตัวอักษร')
export const loginSchema = z.object({
  email: z
    .email('กรุณากรอกอีเมลให้ถูกต้อง')
    .max(254)
    .transform((value) => value.toLowerCase()),
  password: z
    .string()
    .min(8, 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')
    .max(128, 'รหัสผ่านยาวเกินไป'),
})
export const registerSchema = loginSchema
  .extend({
    username: usernameSchema,
    displayName,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'รหัสผ่านไม่ตรงกัน',
    path: ['confirmPassword'],
  })
export const profileSchema = z.object({ username: usernameSchema, displayName })
