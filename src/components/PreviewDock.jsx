import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePreview } from '../context/PreviewContext'
import useFetch from '../hooks/useFetch'
import { selectTrailer } from '../services/tmdb.ts'
import Icon from './Icon'
export default function PreviewDock() {
  const { movie, requestId, close } = usePreview()
  const { data, loading, error, retry } = useFetch(
    movie ? '/api/movies/' + movie.id : null,
  )
  const [expanded, setExpanded] = useState(false)
  const dialog = useRef(null)
  const trailer = selectTrailer(data?.videos?.results)
  useEffect(() => {
    setExpanded(Boolean(movie))
  }, [movie?.id, requestId])
  useEffect(() => {
    if (expanded && dialog.current && !dialog.current.open)
      dialog.current.showModal()
  }, [expanded])
  if (!movie)
    return (
      <aside className="preview-dock idle-dock" aria-label="แถบตัวอย่างหนัง">
        <div className="dock-title">
          <Icon name="film" />
          <div>
            <strong>เลือกหนังที่อยากรู้จัก</strong>
            <span>กดปุ่มเล่นบนโปสเตอร์เพื่อเลือกตัวอย่างหนัง</span>
          </div>
        </div>
        <Link
          className="round-play"
          href="/movies"
          aria-label="ค้นหาหนังเพื่อดูตัวอย่าง"
        >
          <Icon name="search" />
        </Link>
      </aside>
    )
  return (
    <>
      <aside className="preview-dock" aria-label="ตัวอย่างหนังที่เลือก">
        <div className="dock-title">
          <Icon name="film" />
          <div>
            <Link href={'/movies/' + movie.id}>{movie.title}</Link>
            <span>
              {loading
                ? 'กำลังโหลดตัวอย่าง…'
                : error
                  ? error.message
                  : trailer
                    ? 'ตัวอย่างหนัง · YouTube'
                    : 'เรื่องนี้ยังไม่มีตัวอย่างหนัง'}
            </span>
          </div>
        </div>
        {error ? (
          <button className="button secondary small" onClick={retry}>
            ลองใหม่
          </button>
        ) : (
          trailer && (
            <button
              className="round-play"
              aria-label={'เล่นตัวอย่าง ' + movie.title}
              onClick={() => setExpanded(true)}
            >
              <Icon name="play" />
            </button>
          )
        )}
        <button
          className="dock-close"
          aria-label="ปิดตัวอย่างหนัง"
          onClick={close}
        >
          <Icon name="close" />
        </button>
      </aside>
      {expanded && (
        <dialog
          ref={dialog}
          className="trailer-dialog"
          aria-label={'ตัวอย่าง ' + movie.title}
          onClose={() => setExpanded(false)}
        >
          <header>
            <strong>{movie.title}</strong>
            <button
              aria-label="ปิดวิดีโอ"
              onClick={() => {
                dialog.current.close()
                setExpanded(false)
              }}
            >
              <Icon name="close" />
            </button>
          </header>
          {loading ? (
            <p role="status">กำลังโหลดตัวอย่าง…</p>
          ) : error ? (
            <div className="notice error" role="alert">
              <p>{error.message}</p>
              <button className="button secondary small" onClick={retry}>
                ลองใหม่
              </button>
            </div>
          ) : trailer ? (
            <>
              <iframe
                title={'ตัวอย่าง ' + movie.title}
                src={
                  'https://www.youtube-nocookie.com/embed/' +
                  trailer.key +
                  '?autoplay=1'
                }
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
              />
              <a
                className="text-link"
                href={'https://www.youtube.com/watch?v=' + trailer.key}
                target="_blank"
                rel="noreferrer"
              >
                เปิดบน YouTube ↗
              </a>
            </>
          ) : (
            <p role="status">เรื่องนี้ยังไม่มีตัวอย่างหนัง</p>
          )}
        </dialog>
      )}
    </>
  )
}
