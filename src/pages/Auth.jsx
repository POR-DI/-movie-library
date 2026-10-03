import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '../context/AuthContext'
import { loginSchema, registerSchema } from '../schemas/auth'
import { Loading } from '../components/States'
import Icon from '../components/Icon'
export default function Auth({ register: signUp = false }) {
  const { user, loading, authenticate } = useAuth()
  const [params] = useSearchParams()
  const requested = params.get('next') || '/library'
  const next =
    /^\/(?!\/)/.test(requested) &&
    !requested.includes('\\') &&
    !/^\/(login|register)(?:[/?#]|$)/.test(requested)
      ? requested
      : '/library'
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(signUp ? registerSchema : loginSchema),
    mode: 'onTouched',
  })
  async function submit(values) {
    try {
      await authenticate(signUp ? 'register' : 'login', values)
    } catch (error) {
      setError('root', { message: error.message })
    }
  }
  if (loading) return <Loading />
  if (user) return <Navigate to={next} replace />
  const fields = [
    ...(signUp
      ? [
          {
            name: 'name',
            label: 'ชื่อที่แสดงในห้องสมุด',
            type: 'text',
            auto: 'nickname',
            placeholder: 'ชื่อของคุณ',
          },
        ]
      : []),
    {
      name: 'email',
      label: 'อีเมล',
      type: 'email',
      auto: 'email',
      placeholder: 'you@example.com',
    },
    {
      name: 'password',
      label: 'รหัสผ่าน',
      type: 'password',
      auto: signUp ? 'new-password' : 'current-password',
      placeholder: 'อย่างน้อย 8 ตัวอักษร',
    },
    ...(signUp
      ? [
          {
            name: 'confirmPassword',
            label: 'ยืนยันรหัสผ่าน',
            type: 'password',
            auto: 'new-password',
            placeholder: 'กรอกรหัสผ่านอีกครั้ง',
          },
        ]
      : []),
  ]
  return (
    <div className="page auth-page">
      <div className="auth-art">
        <div className="auth-art-shade" />
        <div>
          <span className="eyebrow">A HOME FOR YOUR FAVORITE FILMS</span>
          <h2>
            เพราะหนังบางเรื่อง
            <br />
            มีค่ามากกว่า
            <br />
            <span className="accent">แค่การดูจบ.</span>
          </h2>
          <p>
            เก็บทุกเรื่องที่ประทับใจไว้ด้วยกัน
            <br />
            ในห้องสมุดที่เป็นคุณ
          </p>
        </div>
        <span className="auth-art-credit">INTERSTELLAR · 2014</span>
      </div>
      <section className="auth-form-panel">
        <span className="eyebrow">
          {signUp ? 'YOUR FIRST CHAPTER' : 'WELCOME BACK'}
        </span>
        <h1>{signUp ? 'เริ่มต้นชั้นหนังของคุณ' : 'กลับมาที่ชั้นหนังของคุณ'}</h1>
        <p className="muted">
          {signUp
            ? 'สร้างบัญชี แล้วเริ่มสะสมเรื่องราวที่คุณชอบ'
            : 'เข้าสู่ระบบเพื่อพบกับเรื่องราวที่คุณเก็บไว้'}
        </p>
        <form onSubmit={handleSubmit(submit)} noValidate>
          {fields.map((field) => (
            <div className="form-field" key={field.name}>
              <label htmlFor={field.name}>{field.label}</label>
              <input
                id={field.name}
                type={field.type}
                autoComplete={field.auto}
                placeholder={field.placeholder}
                maxLength={
                  field.name === 'name'
                    ? 30
                    : field.name === 'email'
                      ? 254
                      : 128
                }
                aria-invalid={Boolean(errors[field.name])}
                aria-describedby={
                  errors[field.name] ? field.name + '-error' : undefined
                }
                {...register(field.name)}
              />
              {errors[field.name] && (
                <span id={field.name + '-error'} className="field-error">
                  {errors[field.name].message}
                </span>
              )}
            </div>
          ))}
          {errors.root && (
            <p className="notice error" role="alert">
              {errors.root.message}
            </p>
          )}
          <button className="button primary full-width" disabled={isSubmitting}>
            {isSubmitting
              ? 'กำลังดำเนินการ…'
              : signUp
                ? 'สร้างบัญชีของฉัน'
                : 'เข้าสู่ระบบ'}
            <Icon name="arrow" />
          </button>
        </form>
        <p className="auth-switch">
          {signUp ? 'มีบัญชีแล้ว?' : 'ยังไม่มีห้องสมุดของตัวเอง?'}{' '}
          <Link
            to={
              (signUp ? '/login' : '/register') +
              '?next=' +
              encodeURIComponent(next)
            }
          >
            {signUp ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
          </Link>
        </p>
      </section>
    </div>
  )
}
