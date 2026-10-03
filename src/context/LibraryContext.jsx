import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useAuth } from './AuthContext'
import { api } from '../lib/api'
import {
  emptyPortfolio,
  importLegacy,
  personalMovie,
  readPortfolio,
  storageKey,
  writePortfolio,
} from '../storage/portfolio.ts'
const LibraryContext = createContext(null)
export function LibraryProvider({ children }) {
  const { user } = useAuth()
  const owner = user ? String(user.id) : 'guest'
  // Owner-keyed state prevents one account's data leaking into another during login/logout.
  return (
    <OwnerLibrary key={owner} owner={owner} user={user}>
      {children}
    </OwnerLibrary>
  )
}
function OwnerLibrary({ owner, user, children }) {
  const [initial] = useState(() => {
    try {
      return { data: readPortfolio(localStorage, owner), error: null }
    } catch (error) {
      return { data: emptyPortfolio(), error }
    }
  })
  const [data, setData] = useState(initial.data)
  const current = useRef(data)
  const [error, setError] = useState(initial.error)
  const [metadata, setMetadata] = useState({})
  const [metadataError, setMetadataError] = useState(false)
  const [syncError, setSyncError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [busy, setBusy] = useState(false)
  const syncLock = useRef(false)
  function commit(next) {
    if (error) throw error
    writePortfolio(localStorage, owner, next)
    current.current = next
    setData(next)
  }
  useEffect(() => {
    function refresh(event) {
      if (event.key !== storageKey(owner)) return
      try {
        const next = readPortfolio(localStorage, owner)
        current.current = next
        setData(next)
        setError(null)
      } catch (err) {
        setError(err)
      }
    }
    window.addEventListener('storage', refresh)
    return () => window.removeEventListener('storage', refresh)
  }, [owner])
  useEffect(() => {
    if (!user || current.current.legacyImported || error) return
    let active = true
    api('/api/library')
      .then(({ movies }) => {
        if (!active) return
        // Preserve existing server records; import identifiers once without overwriting personal edits.
        commit(
          importLegacy(
            current.current,
            movies.map((m) => m.id),
          ),
        )
        setMetadata((old) => ({
          ...Object.fromEntries(movies.map((m) => [m.id, m])),
          ...old,
        }))
        setSyncError('')
      })
      .catch(() => {
        if (active)
          setSyncError('นำเข้าห้องสมุดเดิมไม่ได้ รายการในเครื่องยังใช้งานได้')
      })
    return () => {
      active = false
    }
  }, [owner, user?.id, attempt, error])
  const ids = data.movies.map((m) => m.tmdbMovieId).join(',')
  useEffect(() => {
    let active = true
    const movieIds = ids ? ids.split(',').map(Number) : []
    setMetadataError(false)
    // Bounded batches avoid flooding TMDB when opening a large saved library.
    async function hydrate() {
      for (let i = 0; i < movieIds.length; i += 4) {
        const results = await Promise.allSettled(
          movieIds.slice(i, i + 4).map((id) => api('/api/movies/' + id)),
        )
        if (!active) return
        for (const result of results) {
          if (result.status === 'fulfilled')
            setMetadata((old) => ({ ...old, [result.value.id]: result.value }))
          else setMetadataError(true)
        }
      }
    }
    hydrate()
    return () => {
      active = false
    }
  }, [ids, attempt])
  const queue = data.pendingSync.join(',')
  useEffect(() => {
    if (!user || !queue || error || syncLock.current) return
    let active = true
    syncLock.current = true
    setBusy(true)
    async function sync() {
      try {
        for (const id of queue.split(',').map(Number)) {
          const saved = current.current.movies.some((m) => m.tmdbMovieId === id)
          await api(saved ? '/api/library' : '/api/library/' + id, {
            method: saved ? 'POST' : 'DELETE',
            ...(saved ? { body: JSON.stringify({ movieId: id }) } : {}),
          })
          if (!active) return
        }
        if (active) {
          const completed = new Set(queue.split(',').map(Number))
          commit({
            ...current.current,
            pendingSync: current.current.pendingSync.filter(
              (id) => !completed.has(id),
            ),
          })
          setSyncError('')
        }
      } catch {
        if (active)
          setSyncError(
            'บันทึกในเครื่องแล้ว แต่ยังซิงก์ลิงก์แชร์ไม่ได้ กรุณาลองอีกครั้ง',
          )
      } finally {
        syncLock.current = false
        if (active) setBusy(false)
      }
    }
    sync()
    return () => {
      active = false
      syncLock.current = false
    }
  }, [owner, user?.id, queue, attempt, error])
  async function toggle(movie) {
    const old = current.current
    const saved = old.movies.some((m) => m.tmdbMovieId === movie.id)
    commit({
      ...old,
      movies: saved
        ? old.movies.filter((m) => m.tmdbMovieId !== movie.id)
        : [...old.movies, personalMovie(movie.id)],
      removedIds: saved
        ? [...new Set([...old.removedIds, movie.id])]
        : old.removedIds.filter((id) => id !== movie.id),
      pendingSync: user
        ? [...new Set([...old.pendingSync, movie.id])]
        : old.pendingSync,
    })
    setMetadata((old) => ({ ...old, [movie.id]: movie }))
  }
  function updatePersonal(id, patch) {
    commit({
      ...current.current,
      movies: current.current.movies.map((m) =>
        m.tmdbMovieId === id ? { ...m, ...patch, tmdbMovieId: id } : m,
      ),
    })
  }
  function createPlaylist(name) {
    const clean = name.trim()
    if (!clean) return
    const existing = current.current.playlists.find((p) => p.name === clean)
    if (existing) return existing.id
    const id = crypto.randomUUID()
    commit({
      ...current.current,
      playlists: [...current.current.playlists, { id, name: clean }],
    })
    return id
  }
  function removePlaylist(id) {
    commit({
      ...current.current,
      playlists: current.current.playlists.filter((p) => p.id !== id),
      movies: current.current.movies.map((m) => ({
        ...m,
        playlistIds: m.playlistIds.filter((p) => p !== id),
      })),
    })
  }
  function retry() {
    try {
      const next = readPortfolio(localStorage, owner)
      current.current = next
      setData(next)
      setError(null)
    } catch (err) {
      setError(err)
    }
    setAttempt((v) => v + 1)
  }
  const movies = data.movies.map(
    (m) =>
      metadata[m.tmdbMovieId] || {
        id: m.tmdbMovieId,
        title: 'TMDB #' + m.tmdbMovieId,
        poster_path: null,
        release_date: '',
        vote_average: 0,
      },
  )
  return (
    <LibraryContext.Provider
      value={{
        movies,
        personal: data.movies,
        playlists: data.playlists,
        loading: false,
        error,
        retry,
        busy,
        toggle,
        updatePersonal,
        createPlaylist,
        removePlaylist,
        metadataError,
        syncError,
        has: (id) => data.movies.some((m) => m.tmdbMovieId === id),
      }}
    >
      {children}
    </LibraryContext.Provider>
  )
}
export function useLibrary() {
  const value = useContext(LibraryContext)
  if (!value) throw new Error('useLibrary ต้องอยู่ภายใน LibraryProvider')
  return value
}
