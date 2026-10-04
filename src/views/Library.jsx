'use client'

import { useState } from 'react'
import Link from 'next/link'
import Redirect from '../components/Redirect'
import { useAuth } from '../context/AuthContext'
import { useLibrary } from '../context/LibraryContext'
import { itemToMovie } from '../lib/library'
import MovieCard from '../components/MovieCard'
import { Empty, ErrorState, Loading } from '../components/States'
import Icon from '../components/Icon'
const tabs = [
  ['liked', 'ถูกใจ'],
  ['watchlist', 'อยากดู'],
]
export default function Library() {
  const { user, profile, loading: authLoading } = useAuth()
  const { items, loading, error, retry } = useLibrary()
  const [tab, setTab] = useState('liked')
  const [query, setQuery] = useState('')
  if (authLoading) return <Loading />
  if (!user) return <Redirect to="/login?next=/library" />
  if (!profile)
    return <ErrorState error={new Error('โหลดโปรไฟล์ไม่ได้ กรุณารีเฟรช')} />
  const inTab = items.filter((i) => i.kind === tab)
  const visible = inTab
    .filter((i) => i.title.toLowerCase().includes(query.trim().toLowerCase()))
    .map(itemToMovie)
  return (
    <div className="page inner-page">
      <div className="library-heading">
        <div className="page-heading">
          <span className="eyebrow">@{profile.username}</span>
          <h1>
            ห้องสมุดของฉัน<span className="accent">.</span>
          </h1>
          <p>
            เพื่อนเห็นเฉพาะแท็บ “ถูกใจ” เมื่อโปรไฟล์เป็นสาธารณะ ·{' '}
            <Link className="text-link" href="/settings/profile">
              {profile.is_public ? 'สาธารณะ' : 'ส่วนตัว'} — ตั้งค่าการแชร์
            </Link>
          </p>
        </div>
      </div>
      <div className="section-heading library-toolbar">
        <div className="genre-row" role="tablist" aria-label="แท็บห้องสมุด">
          {tabs.map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              className={tab === id ? 'chip selected' : 'chip'}
              onClick={() => setTab(id)}
            >
              {label} ({items.filter((i) => i.kind === id).length})
            </button>
          ))}
        </div>
        <label className="library-search">
          <Icon name="search" />
          <input
            aria-label="ค้นหาในห้องสมุด"
            placeholder="ค้นหาบนชั้นของคุณ…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      {loading ? (
        <Loading cards />
      ) : error ? (
        <ErrorState error={error} retry={retry} />
      ) : !inTab.length ? (
        <Empty
          text={
            tab === 'liked'
              ? 'กด ♥ ที่หนังเรื่องไหนก็ได้ แล้วจะมาอยู่ที่นี่'
              : 'กด 🔖 เพื่อเก็บเรื่องที่อยากดูไว้ก่อน'
          }
        />
      ) : !visible.length ? (
        <Empty
          title="ไม่พบหนังบนชั้นนี้"
          text="ลองเปลี่ยนคำค้นดูอีกครั้ง"
          link={false}
        />
      ) : (
        <div className="movie-grid">
          {visible.map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>
      )}
    </div>
  )
}
