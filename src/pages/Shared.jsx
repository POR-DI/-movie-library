import { useParams } from 'react-router-dom'
import useFetch from '../hooks/useFetch'
import MovieCard from '../components/MovieCard'
import { Empty, ErrorState, Loading } from '../components/States'
import Icon from '../components/Icon'
export default function Shared() {
  const { token } = useParams()
  const { data, loading, error } = useFetch(
    '/api/s/' + encodeURIComponent(token),
  )
  if (loading) return <Loading />
  if (error)
    return (
      <div className="page">
        <ErrorState error={error} />
      </div>
    )
  return (
    <div className="page inner-page">
      <div className="shared-label">
        <Icon name="share" size={16} /> SHARED WITH YOU
      </div>
      <div className="page-heading">
        <span className="eyebrow">A COLLECTION WORTH SHARING</span>
        <h1>
          ห้องสมุดของ {data.name}
          <span className="accent">.</span>
        </h1>
        <p>
          {data.movies.length} เรื่องโปรดที่อยากแบ่งปันให้คุณ · ดูได้อย่างเดียว
        </p>
      </div>
      {data.movies.length ? (
        <div className="movie-grid">
          {data.movies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} readOnly />
          ))}
        </div>
      ) : (
        <Empty
          title="ชั้นนี้กำลังรอเรื่องราวใหม่"
          text="เจ้าของยังไม่ได้เพิ่มหนังลงในห้องสมุด"
          link={false}
        />
      )}
    </div>
  )
}
