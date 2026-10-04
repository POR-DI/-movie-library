'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '../context/AuthContext'
import { useLibrary } from '../context/LibraryContext'
import Icon from './Icon'
// react-router's NavLink set class "active"; index.css styles nav > a.active.
function NavItem({ href, end = false, children }) {
  const pathname = usePathname()
  const active = end ? pathname === href : pathname.startsWith(href)
  return (
    <Link
      href={href}
      className={active ? 'active' : undefined}
      aria-current={active ? 'page' : undefined}
    >
      {children}
    </Link>
  )
}
export default function SiteShell({ children }) {
  const { user, profile, signOut: endSession, loading, error } = useAuth()
  const { likedIds, toggleError, dismissToggleError } = useLibrary()
  const [logoutError, setLogoutError] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  function signOut() {
    setLogoutError('')
    setLoggingOut(true)
    router.push('/')
  }
  // Sign out only once "/" is showing: signing out on /library first would let its
  // login redirect race (and beat) the navigation home.
  useEffect(() => {
    if (!loggingOut || pathname !== '/') return
    endSession()
      .catch((error) => setLogoutError(error.message))
      .finally(() => setLoggingOut(false))
  }, [loggingOut, pathname])
  return (
    <>
      <a className="skip-link" href="#main">
        ข้ามไปเนื้อหา
      </a>
      <header className="site-header">
        <div className="nav-inner">
          <Link href="/" className="brand">
            <span className="brand-icon">
              <Icon name="film" size={22} />
            </span>
            Cine<span>Shelf</span>
            <span className="brand-dot">.</span>
          </Link>
          <nav aria-label="เมนูหลัก">
            <NavItem href="/" end>
              หน้าแรก
            </NavItem>
            <NavItem href="/movies">สำรวจหนัง</NavItem>
            <NavItem href="/library">
              ห้องสมุดของฉัน <span className="count">{likedIds.size}</span>
            </NavItem>
          </nav>
          <div className="account-nav">
            {loading ? (
              <span className="muted">กำลังโหลด…</span>
            ) : user && profile ? (
              <>
                <Link
                  className="avatar"
                  href={'/u/' + profile.username}
                  title={'โปรไฟล์ของ ' + profile.display_name}
                >
                  {profile.display_name.slice(0, 1)}
                </Link>
                <Link className="text-button" href="/settings/profile">
                  ตั้งค่าโปรไฟล์
                </Link>
                <button
                  className="text-button"
                  disabled={loggingOut}
                  onClick={signOut}
                >
                  ออกจากระบบ
                </button>
              </>
            ) : (
              <>
                <Link className="login-link" href="/login">
                  เข้าสู่ระบบ
                </Link>
                <Link className="button primary small" href="/register">
                  สร้างห้องสมุด <Icon name="arrow" size={16} />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      {(logoutError || error) && (
        <div className="notice error" role="alert">
          {logoutError || error.message}
        </div>
      )}
      {toggleError && (
        <div className="notice error" role="alert">
          {toggleError} <button onClick={dismissToggleError}>ปิด</button>
        </div>
      )}
      <main id="main" key={pathname}>
        {children}
      </main>
      <footer className="site-footer">
        <div>
          <Link href="/" className="brand footer-brand">
            CineShelf<span className="brand-dot">.</span>
          </Link>
          <p>ทุกเรื่องที่รัก มีที่อยู่บนชั้นของคุณ</p>
        </div>
        <div className="footer-right">
          <span>MADE FOR THE LOVE OF CINEMA</span>
          <Link href="/about">เกี่ยวกับเว็บและแหล่งข้อมูล ↗</Link>
        </div>
      </footer>
    </>
  )
}
