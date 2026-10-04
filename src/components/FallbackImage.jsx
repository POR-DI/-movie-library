'use client'

import { useState } from 'react'
// Server Components cannot attach onError, so broken TMDB images swap to the fallback here.
export default function FallbackImage({ src, alt, loading, fallback = null }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) return fallback
  return (
    <img src={src} alt={alt} loading={loading} onError={() => setFailed(true)} />
  )
}
