import { useState } from 'react'
import Link from 'next/link'
import { Navigate } from '../lib/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '../context/AuthContext'
import { usernameAvailable } from '../lib/profiles'
import { normalizeUsername, profileSchema } from '../schemas/auth'
import { ErrorState, Loading } from '../components/States'
export default function ProfileSettings() {
  const { user, profile, loading, updateProfile } = useAuth()
  const [message, setMessage] = useState('')
  const [toggling, setToggling] = useState(false)
  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(profileSchema),
    mode: 'onTouched',
    values: profile
      ? { username: profile.username, displayName: profile.display_name }
      : undefined,
  })
  if (loading) return <Loading />
  if (!user) return <Navigate href="/login?next=/settings/profile" replace />
  if (!profile)
    return <ErrorState error={new Error('โหลดโปรไฟล์ไม่ได้ กรุณารีเฟรช')} />
  const link = window.location.origin + '/u/' + profile.username
  const renaming =
    normalizeUsername(watch('username') || '') !== profile.username
  async function save(values) {
    setMessage('')
    try {
      if (
        values.username !== profile.username &&
        !(await usernameAvailable(values.username))
      )
        return setError('username', { message: 'ชื่อผู้ใช้นี้ถูกใช้แล้ว' })
      await updateProfile({
        username: values.username,
        display_name: values.displayName,
      })
      setMessage('บันทึกแล้ว')
    } catch (error) {
      setError('root', { message: error.message })
    }
  }
  async function togglePublic() {
    setToggling(true)
    setMessage('')
    try {
      await updateProfile({ is_public: !profile.is_public })
    } catch (error) {
      setMessage(error.message)
    } finally {
      setToggling(false)
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(link)
      setMessage('คัดลอกลิงก์แล้ว ส่งให้เพื่อนได้เลย')
    } catch {
      setMessage('คัดลอกอัตโนมัติไม่ได้ กรุณาเลือกลิงก์แล้วคัดลอกเอง')
    }
  }
  return (
    <div className="page inner-page settings-page">
      <div className="page-heading">
        <span className="eyebrow">PROFILE</span>
        <h1>
          ตั้งค่าโปรไฟล์<span className="accent">.</span>
        </h1>
      </div>
      <section className="share-panel">
        <div className="share-description">
          <div>
            <h2>{profile.is_public ? 'โปรไฟล์สาธารณะ' : 'โปรไฟล์ส่วนตัว'}</h2>
            <p>
              {profile.is_public
                ? 'ใครมีลิงก์ก็เห็นหนังที่คุณกดถูกใจ โดยไม่ต้องเข้าสู่ระบบ (ไม่เห็นรายการอยากดูและอีเมล)'
                : 'มีแค่คุณที่เห็นโปรไฟล์นี้ คนอื่นเปิดลิงก์จะไม่เห็นอะไร'}
            </p>
          </div>
        </div>
        <div className="share-actions">
          <button
            className="button secondary small"
            role="switch"
            aria-checked={profile.is_public}
            onClick={togglePublic}
            disabled={toggling}
          >
            {toggling
              ? 'กำลังบันทึก…'
              : profile.is_public
                ? 'เปลี่ยนเป็นส่วนตัว'
                : 'เปิดเป็นสาธารณะ'}
          </button>
          <button className="button primary small" onClick={copy}>
            คัดลอกลิงก์
          </button>
        </div>
        <div className="share-link-row">
          <input
            aria-label="ลิงก์โปรไฟล์"
            value={link}
            readOnly
            onFocus={(e) => e.target.select()}
          />
          <Link className="text-link" href={'/u/' + profile.username}>
            ดูหน้าโปรไฟล์ ↗
          </Link>
        </div>
        {message && (
          <p className="share-message" role="status">
            {message}
          </p>
        )}
      </section>
      <form onSubmit={handleSubmit(save)} noValidate className="settings-form">
        {[
          ['displayName', 'ชื่อที่แสดง', 50],
          ['username', 'ชื่อผู้ใช้ (ใช้ในลิงก์โปรไฟล์)', 20],
        ].map(([name, label, max]) => (
          <div className="form-field" key={name}>
            <label htmlFor={name}>{label}</label>
            <input
              id={name}
              maxLength={max}
              aria-invalid={Boolean(errors[name])}
              aria-describedby={errors[name] ? name + '-error' : undefined}
              {...register(name)}
            />
            {errors[name] && (
              <span id={name + '-error'} className="field-error">
                {errors[name].message}
              </span>
            )}
          </div>
        ))}
        {renaming && (
          <p className="notice" role="status">
            เปลี่ยนชื่อผู้ใช้แล้ว ลิงก์เก่าที่เคยแชร์ไปจะใช้ไม่ได้
          </p>
        )}
        {errors.root && (
          <p className="notice error" role="alert">
            {errors.root.message}
          </p>
        )}
        <button className="button primary" disabled={isSubmitting}>
          {isSubmitting ? 'กำลังบันทึก…' : 'บันทึก'}
        </button>
      </form>
    </div>
  )
}
