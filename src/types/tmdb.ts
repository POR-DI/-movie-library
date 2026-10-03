export interface Genre {
  id: number
  name: string
}
export interface Movie {
  id: number
  title: string
  original_title: string
  overview: string
  release_date: string
  poster_path: string | null
  backdrop_path: string | null
  vote_average: number
  vote_count: number
  popularity: number
  original_language: string
  genre_ids?: number[]
  adult?: boolean
}
export interface Page<T> {
  page: number
  results: T[]
  total_pages: number
  total_results: number
}
export interface Cast {
  id: number
  name: string
  character: string
  profile_path: string | null
  order: number
}
export interface Crew {
  id: number
  name: string
  job: string
  department: string
  profile_path: string | null
}
export interface Video {
  id: string
  key: string
  name: string
  site: string
  type: string
  official: boolean
  iso_639_1: string
}
export interface TmdbImage {
  file_path: string
  width: number
  height: number
  aspect_ratio: number
  iso_639_1: string | null
  vote_average: number
  vote_count: number
}
export interface MovieDetails extends Movie {
  genres: Genre[]
  runtime: number | null
  production_companies: {
    id: number
    name: string
    logo_path: string | null
    origin_country: string
  }[]
  production_countries: { iso_3166_1: string; name: string }[]
  credits?: { cast: Cast[]; crew: Crew[] }
  videos?: { results: Video[] }
  images?: { posters: TmdbImage[]; backdrops: TmdbImage[]; logos: TmdbImage[] }
  recommendations?: Page<Movie>
  similar?: Page<Movie>
  overviewLanguage?: 'th-TH' | 'en-US'
  fallbackUnavailable?: boolean
}
