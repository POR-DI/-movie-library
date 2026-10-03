export interface PersonalMovie {
  tmdbMovieId: number
  status: 'watchlist' | 'watched'
  favorite: boolean
  rating: number | null
  review: string
  watchedAt: string
  playlistIds: string[]
}
export interface Playlist {
  id: string
  name: string
}
export interface Portfolio {
  version: 1
  movies: PersonalMovie[]
  playlists: Playlist[]
  legacyImported: boolean
  // Removed IDs must not reappear if legacy import finishes after a local edit.
  removedIds: number[]
  pendingSync: number[]
}
export const storageKey = (owner: string) => `cineshelf:portfolio:v1:${owner}`
export const emptyPortfolio = (): Portfolio => ({
  version: 1,
  movies: [],
  playlists: [],
  legacyImported: false,
  removedIds: [],
  pendingSync: [],
})
export const personalMovie = (id: number): PersonalMovie => ({
  tmdbMovieId: id,
  status: 'watchlist',
  favorite: false,
  rating: null,
  review: '',
  watchedAt: '',
  playlistIds: [],
})
function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object'
}
function validMovie(v: unknown): v is PersonalMovie {
  return (
    record(v) &&
    Number.isSafeInteger(v.tmdbMovieId) &&
    Number(v.tmdbMovieId) > 0 &&
    (v.status === 'watchlist' || v.status === 'watched') &&
    typeof v.favorite === 'boolean' &&
    (v.rating === null ||
      (typeof v.rating === 'number' && v.rating >= 0 && v.rating <= 10)) &&
    typeof v.review === 'string' &&
    typeof v.watchedAt === 'string' &&
    Array.isArray(v.playlistIds) &&
    v.playlistIds.every((id) => typeof id === 'string')
  )
}
function validIds(v: unknown): v is number[] {
  return Array.isArray(v) && v.every((id) => Number.isSafeInteger(id) && id > 0)
}
export function readPortfolio(
  storage: Pick<Storage, 'getItem'>,
  owner: string,
): Portfolio {
  const raw = storage.getItem(storageKey(owner))
  if (!raw) return emptyPortfolio()
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    throw new Error(
      'อ่านข้อมูลส่วนตัวไม่ได้ ข้อมูลเดิมยังถูกเก็บไว้ กรุณาสำรองข้อมูลก่อนแก้ไข',
    )
  }
  if (
    !record(data) ||
    data.version !== 1 ||
    !Array.isArray(data.movies) ||
    !data.movies.every(validMovie) ||
    !Array.isArray(data.playlists) ||
    !data.playlists.every(
      (p) =>
        record(p) && typeof p.id === 'string' && typeof p.name === 'string',
    ) ||
    typeof data.legacyImported !== 'boolean' ||
    !validIds(data.removedIds) ||
    !validIds(data.pendingSync)
  )
    throw new Error('รูปแบบข้อมูลส่วนตัวไม่รองรับ ข้อมูลเดิมยังถูกเก็บไว้')
  return data as unknown as Portfolio
}
export function writePortfolio(
  storage: Pick<Storage, 'setItem'>,
  owner: string,
  data: Portfolio,
) {
  // Explicit serialization prevents accidentally persisting TMDB metadata or credentials.
  const movies = data.movies.map((m) => ({
    tmdbMovieId: m.tmdbMovieId,
    status: m.status,
    favorite: m.favorite,
    rating: m.rating,
    review: m.review,
    watchedAt: m.watchedAt,
    playlistIds: m.playlistIds,
  }))
  try {
    storage.setItem(storageKey(owner), JSON.stringify({ ...data, movies }))
  } catch {
    throw new Error(
      'บันทึกในเครื่องไม่ได้ พื้นที่อาจเต็มหรือเบราว์เซอร์ปิด localStorage',
    )
  }
}
export function importLegacy(data: Portfolio, ids: number[]): Portfolio {
  if (data.legacyImported) return data
  const known = new Set([
    ...data.movies.map((m) => m.tmdbMovieId),
    ...data.removedIds,
  ])
  return {
    ...data,
    legacyImported: true,
    movies: [
      ...data.movies,
      ...ids
        .filter((id) => Number.isSafeInteger(id) && id > 0 && !known.has(id))
        .map((id) => ({ ...personalMovie(id), favorite: true })),
    ],
  }
}
