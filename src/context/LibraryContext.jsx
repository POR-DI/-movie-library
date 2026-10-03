import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useAuth } from './AuthContext'
import { supabase } from '../lib/supabase'
import { toThaiMessage } from '../lib/supabaseErrors'
import { applyToggle, idsOf, revertToggle } from '../lib/library'
const LibraryContext = createContext(null)
export function LibraryProvider({ children }) {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const latest = useRef(items)
  const [loading, setLoading] = useState(Boolean(user))
  const [error, setError] = useState(null)
  const [pending, setPending] = useState(() => new Set())
  const [attempt, setAttempt] = useState(0)
  function commit(next) {
    latest.current = next
    setItems(next)
  }
  useEffect(() => {
    if (!user) return setLoading(false)
    let active = true
    setLoading(true)
    supabase
      .from('library_items')
      .select('tmdb_movie_id, kind, title, poster_path, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!active) return
        if (error) setError(new Error(toThaiMessage(error)))
        else {
          commit(data)
          setError(null)
        }
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [user?.id, attempt])
  const likedIds = useMemo(() => idsOf(items, 'liked'), [items])
  const watchlistIds = useMemo(() => idsOf(items, 'watchlist'), [items])
  const key = (id, kind) => kind + ':' + id
  async function toggle(movie, kind) {
    if (!user) throw new Error('กรุณาเข้าสู่ระบบก่อน')
    const k = key(movie.id, kind)
    if (pending.has(k)) return
    setPending((old) => new Set(old).add(k))
    // Optimistic: show the change now, undo only this toggle if Supabase rejects it.
    const result = applyToggle(latest.current, movie, kind, user.id)
    commit(result.items)
    const table = supabase.from('library_items')
    const { error } =
      result.action === 'insert'
        ? await table.upsert(result.row, {
            onConflict: 'user_id,tmdb_movie_id,kind',
            ignoreDuplicates: true,
          })
        : await table.delete().match(result.row)
    setPending((old) => {
      const next = new Set(old)
      next.delete(k)
      return next
    })
    if (error) {
      commit(revertToggle(latest.current, result))
      throw new Error(toThaiMessage(error))
    }
  }
  return (
    <LibraryContext.Provider
      value={{
        items,
        likedIds,
        watchlistIds,
        loading,
        error,
        retry: () => setAttempt((v) => v + 1),
        has: (id, kind) =>
          (kind === 'liked' ? likedIds : watchlistIds).has(id),
        isPending: (id, kind) => pending.has(key(id, kind)),
        toggle,
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
