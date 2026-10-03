import { useState } from 'react'
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLibrary } from '../context/LibraryContext'
import Icon from './Icon'
export default function Layout() {
  const { user, logout, loading, error, retry } = useAuth()
  const { movies } = useLibrary()
  const [logoutError, setLogoutError] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)
  const navigate = useNavigate(),
    location = useLocation()
  async function signOut() {
    setLoggingOut(true)
    try {
      await logout()
      navigate('/')
    } catch (error) {
      setLogoutError(error.message)
    } finally {
      setLoggingOut(false)
    }
  }
  return (
    <>
      <a className="skip-link" href="#main">
        ข้ามไปเนื้อหา
      </a>
      <header className="site-header">
        <div className="nav-inner">
          <Link to="/" className="brand">
            <span className="brand-icon">
              <Icon name="film" size={22} />
            </span>
            Cine<span>Shelf</span>
            <span className="brand-dot">.</span>
          </Link>
          <nav aria-label="เมนูหลัก">
            <NavLink to="/" end>
              หน้าแรก
            </NavLink>
            <NavLink to="/movies">สำรวจหนัง</NavLink>
            <NavLink to="/library">
              ห้องสมุดของฉัน <span className="count">{movies.length}</span>
            </NavLink>
          </nav>
          <div className="account-nav">
            {loading ? (
              <span className="muted">กำลังโหลด…</span>
            ) : user ? (
              <>
                <span className="avatar" title={user.name}>
                  {user.name.slice(0, 1)}
                </span>
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
                <Link className="login-link" to="/login">
                  เข้าสู่ระบบ
                </Link>
                <Link className="button primary small" to="/register">
                  สร้างห้องสมุด <Icon name="arrow" size={16} />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      {(logoutError || error) && (
        <div className="notice error" role="alert">
          {logoutError || error.message}{' '}
          {error && <button onClick={retry}>ลองเชื่อมต่อใหม่</button>}
        </div>
      )}
      <main id="main" key={location.pathname}>
        <Outlet />
      </main>
      <footer className="site-footer">
        <div>
          <Link to="/" className="brand footer-brand">
            CineShelf<span className="brand-dot">.</span>
          </Link>
          <p>ทุกเรื่องที่รัก มีที่อยู่บนชั้นของคุณ</p>
        </div>
        <div className="footer-right">
          <span>MADE FOR THE LOVE OF CINEMA</span>
          <Link to="/about">เกี่ยวกับเว็บและแหล่งข้อมูล ↗</Link>
        </div>
      </footer>
    </>
  )
}
