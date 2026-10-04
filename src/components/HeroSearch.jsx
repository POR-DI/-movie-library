'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Icon from './Icon'
export default function HeroSearch() {
  const [query, setQuery] = useState('')
  const router = useRouter()
  function search(event) {
    event.preventDefault()
    router.push(
      '/movies' +
        (query.trim() ? '?q=' + encodeURIComponent(query.trim()) : ''),
    )
  }
  return (
    <form className="hero-search" onSubmit={search}>
      <Icon name="search" />
      <input
        aria-label="ค้นหาหนังเรื่องโปรด"
        placeholder="วันนี้อยากเก็บหนังเรื่องไหน?"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        maxLength={150}
      />
      <button className="button primary" type="submit">
        ค้นหาหนัง <Icon name="arrow" size={17} />
      </button>
    </form>
  )
}
