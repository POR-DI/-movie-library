import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { NavLink, useLocation, useNavigate } from '../lib/navigation'
import { useAuth } from '../context/AuthContext'
import { useLibrary } from '../context/LibraryContext'
import { usePreview } from '../context/PreviewContext'
import PreviewDock from './PreviewDock'
import NowShowing from './NowShowing'
import Icon from './Icon'
const navigation = [
  ['/', 'home', 'หน้าแรก'],
  ['/movies', 'search', 'ค้นหา'],
  ['/library', 'shelf', 'ห้องสมุด'],
]
export default function Layout({ children }) {
  const { user, profile, signOut: endSession, loading, error } = useAuth()
  const { likedIds, watchlistIds, items, toggleError, dismissToggleError } =
    useLibrary()
  const { movie } = usePreview()
  const [search, setSearch] = useState('')
  const [libraryQuery, setLibraryQuery] = useState('')
  const [libraryFilter, setLibraryFilter] = useState('all')
  const [librarySort, setLibrarySort] = useState('recent')
  const libraryItems = [...items]
    .filter(
      (item) =>
        (libraryFilter === 'all' || item.kind === libraryFilter) &&
        item.title.toLowerCase().includes(libraryQuery.trim().toLowerCase()),
    )
    .sort((a, b) =>
      librarySort === 'title'
        ? a.title.localeCompare(b.title, 'th')
        : b.created_at.localeCompare(a.created_at),
    )
  const [logoutError, setLogoutError] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)
  const navigate = useNavigate(),
    location = useLocation()
  const content = useRef(null)
  useEffect(() => {
    content.current?.scrollTo(0, 0)
  }, [location.pathname])
  async function signOut() {
    setLoggingOut(true)
    try {
      await endSession()
      navigate('/')
    } catch (error) {
      setLogoutError(error.message)
    } finally {
      setLoggingOut(false)
    }
  }
  return (
    <div
      className={'cinema-app reference-layout' + (movie ? ' has-preview' : '')}
    >
      <a className="skip-link" href="#main">
        ข้ามไปเนื้อหา
      </a>
      <aside className="cinema-sidebar">
        <Link href="/" className="brand">
          <span className="brand-icon">
            <Icon name="film" />
          </span>
          Cine<span>Shelf</span>
        </Link>
        <nav className="sidebar-nav" aria-label="เมนูหลัก">
          {navigation.map(([to, icon, label]) => (
            <NavLink key={to} href={to} end={to === '/'}>
              <Icon name={icon} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-library">
          <div className="sidebar-label">
            <Icon name="shelf" />
            ห้องสมุดของคุณ
            <Link
              className="create-shelf"
              href="/movies"
              aria-label="เพิ่มหนังในห้องสมุด"
            >
              <Icon name="plus" size={17} />
              เพิ่มหนัง
            </Link>
          </div>
          <div className="library-filters">
            {[
              ['all', 'ทั้งหมด'],
              ['liked', 'ถูกใจ'],
              ['watchlist', 'อยากดู'],
            ].map(([value, label]) => (
              <button
                className={libraryFilter === value ? 'chip selected' : 'chip'}
                aria-pressed={libraryFilter === value}
                key={value}
                onClick={() => setLibraryFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="sidebar-tools">
            <label>
              <Icon name="search" size={16} />
              <input
                aria-label="ค้นหาใน sidebar ห้องสมุด"
                placeholder="ค้นหาในห้องสมุด"
                value={libraryQuery}
                onChange={(e) => setLibraryQuery(e.target.value)}
              />
            </label>
            <select
              aria-label="เรียงรายการใน sidebar"
              value={librarySort}
              onChange={(e) => setLibrarySort(e.target.value)}
            >
              <option value="recent">ล่าสุด</option>
              <option value="title">ชื่อ</option>
            </select>
          </div>
          <Link className="shelf-shortcut" href="/library?tab=liked">
            <span className="shelf-cover liked-cover">
              <Icon name="heart" />
            </span>
            <div>
              <strong>หนังที่ถูกใจ</strong>
              <span>{likedIds.size} เรื่อง · คอลเลกชัน</span>
            </div>
          </Link>
          <Link className="shelf-shortcut" href="/library?tab=watchlist">
            <span className="shelf-cover watch-cover">
              <Icon name="bookmark" />
            </span>
            <div>
              <strong>เก็บไว้ดูทีหลัง</strong>
              <span>{watchlistIds.size} เรื่อง · คอลเลกชัน</span>
            </div>
          </Link>
          {!user && (
            <div className="sidebar-invite">
              <strong>ชั้นหนังที่เป็นของคุณ</strong>
              <p>เก็บเรื่องที่ชอบ แล้วกลับมาดูได้ทุกเมื่อ</p>
              <Link className="button primary small" href="/register">
                สร้างห้องสมุด
              </Link>
            </div>
          )}
          {libraryItems.slice(0, 20).map((item) => (
            <Link
              className="sidebar-film"
              key={item.kind + item.tmdb_movie_id}
              href={'/movies/' + item.tmdb_movie_id}
            >
              <Icon
                name={item.kind === 'liked' ? 'heart' : 'bookmark'}
                size={15}
              />
              <span>{item.title}</span>
            </Link>
          ))}
        </div>
        <Link className="sidebar-about" href="/about">
          เกี่ยวกับ CineShelf · TMDB ↗
        </Link>
      </aside>
      <div className="cinema-content" ref={content}>
        <header className="cinema-topbar">
          <Link
            className="topbar-brand"
            href="/"
            aria-label="CineShelf หน้าแรก"
          >
            <Icon name="film" size={28} />
          </Link>
          <div className="topbar-center">
            <Link className="topbar-home" href="/" aria-label="หน้าแรก">
              <Icon name="home" size={25} />
            </Link>
            <form
              className="topbar-search"
              onSubmit={(e) => {
                e.preventDefault()
                navigate(
                  '/movies' +
                    (search.trim()
                      ? '?q=' + encodeURIComponent(search.trim())
                      : ''),
                )
              }}
            >
              <Icon name="search" />
              <input
                aria-label="ค้นหาหนังจากแถบด้านบน"
                placeholder="วันนี้อยากดูเรื่องไหน?"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                maxLength={150}
              />
              <button aria-label="ค้นหาจากแถบด้านบน" type="submit">
                <Icon name="arrow" />
              </button>
            </form>
          </div>
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
                <Link className="login-link" href="/register">
                  สมัครสมาชิก
                </Link>
                <Link className="button primary small" href="/login">
                  เข้าสู่ระบบ
                </Link>
              </>
            )}
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
        <main id="main" key={location.pathname}>
          {children}
        </main>
        <footer className="site-footer">
          <span>CineShelf · ทุกเรื่องที่รัก มีที่อยู่บนชั้นของคุณ</span>
          <Link href="/about">ข้อมูลภาพยนตร์จาก TMDB ↗</Link>
          <a
            href="https://www.flaticon.com/uicons"
            target="_blank"
            rel="noreferrer"
          >
            Uicons by Flaticon
          </a>
        </footer>
      </div>
      <nav className="mobile-nav" aria-label="เมนูมือถือ">
        {navigation.map(([to, icon, label]) => (
          <NavLink key={to} href={to} end={to === '/'}>
            <Icon name={icon} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <NowShowing />
      <PreviewDock />
    </div>
  )
}
