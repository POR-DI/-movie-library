import { getPosterUrl } from '../services/tmdb.ts'
export async function api(url, options = {}) {
  // Movie metadata and credentials are handled by the server.
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })
  const data = await response.json()
  if (!response.ok) {
    const error = new Error(data.error || 'โหลดข้อมูลไม่ได้')
    error.status = response.status
    throw error
  }
  return data
}
export const poster = getPosterUrl
export const year = (movie) => movie.release_date?.slice(0, 4) || 'ไม่ระบุปี'
