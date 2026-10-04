'use client'

import { useState } from 'react'
import MovieCollection from './MovieCollection'
const categories = [
  ['trending', 'Trending'],
  ['popular', 'Popular'],
  ['rating', 'Top Rated'],
  ['now_playing', 'Now Playing'],
  ['upcoming', 'Upcoming'],
]
export default function DiscoveryRoom({ initial }) {
  const [category, setCategory] = useState('trending')
  return (
    <>
      <div className="genre-row" aria-label="หมวดภาพยนตร์">
        {categories.map(([id, label]) => (
          <button
            key={id}
            className={category === id ? 'chip selected' : 'chip'}
            aria-pressed={category === id}
            onClick={() => setCategory(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <MovieCollection category={category} initial={initial} />
    </>
  )
}
