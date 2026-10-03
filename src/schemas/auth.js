import { z } from 'zod'
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
    name: z
      .string()
      .trim()
      .min(2, 'ชื่ออย่างน้อย 2 ตัวอักษร')
      .max(30, 'ชื่อไม่เกิน 30 ตัวอักษร'),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'รหัสผ่านไม่ตรงกัน',
    path: ['confirmPassword'],
  })
