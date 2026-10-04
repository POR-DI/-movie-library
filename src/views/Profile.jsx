'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '../context/AuthContext'
import { fetchProfile } from '../lib/profiles'
import MovieCard from '../components/MovieCard'
import { Empty, ErrorState, Loading } from '../components/States'
import Icon from '../components/Icon'
export default function Profile() {
  const { username } = useParams()
  const { user } = useAuth()
  const [state, setState] = useState({ loading: true })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    setState({ loading: true })
    fetchProfile(username)
      .then((data) => active && setState({ data }))
      .catch((error) => active && setState({ error }))
    return () => {
      active = false
    }
  }, [username, user?.id, attempt])
  if (state.loading) return <Loading />
  if (state.error)
    return (
      <div className="page">
        <ErrorState
          error={state.error}
          retry={() => setAttempt((v) => v + 1)}
        />
      </div>
    )
  if (!state.data)
    return (
      <div className="page">
        <Empty
          title="ไม่พบโปรไฟล์ หรือโปรไฟล์นี้เป็นส่วนตัว"
          text="ตรวจลิงก์อีกครั้ง หรือขอให้เจ้าของเปิดเป็นสาธารณะ"
          link={false}
        />
      </div>
    )
  const { profile, movies } = state.data
  const own = user?.id === profile.id
  return (
    <div className="page inner-page">
      <div className="shared-label">
        <Icon name="share" size={16} />{' '}
        {own && !profile.is_public ? (
          <span className="thai-label">ส่วนตัว — มีแค่คุณที่เห็น</span>
        ) : (
          'SHARED PROFILE'
        )}
      </div>
      <div className="page-heading">
        <span className="eyebrow">@{profile.username}</span>
        <h1>
          หนังที่ {profile.display_name} ถูกใจ
          <span className="accent">.</span>
        </h1>
        <p>{movies.length} เรื่อง · ดูได้อย่างเดียว</p>
      </div>
      {movies.length ? (
        <div className="movie-grid">
          {movies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} readOnly />
          ))}
        </div>
      ) : (
        <Empty
          title="ยังไม่มีหนังที่ถูกใจ"
          text="กลับมาดูใหม่ภายหลัง"
          link={false}
        />
      )}
    </div>
  )
}
