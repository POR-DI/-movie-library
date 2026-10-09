import Link from 'next/link'
import MovieCollection from '../components/MovieCollection'
import Icon from '../components/Icon'
import useFetch from '../hooks/useFetch'
import { getPosterUrl } from '../services/tmdb.ts'
import { usePreview } from '../context/PreviewContext'
import { useLibrary } from '../context/LibraryContext'
import { useAuth } from '../context/AuthContext'
const moods = [
  ['28', 'แอ็กชัน', 'action'],
  ['16', 'แอนิเมชัน', 'animation'],
  ['878', 'ไซไฟ', 'scifi'],
  ['10749', 'โรแมนติก', 'romance'],
]
const collections = [
  ['trending', 'มาแรงในสัปดาห์นี้', 'เรื่องที่คนกำลังพูดถึง'],
  ['rating', 'หนังที่ควรดูสักครั้ง', 'คัดจากคะแนนของผู้ชม'],
  ['now_playing', 'กำลังฉายในโรง', 'ค้นหาเรื่องต่อไปสำหรับคืนดูหนัง'],
  ['upcoming', 'เร็ว ๆ นี้', 'เก็บไว้ในรายการอยากดูก่อนใคร'],
]
export default function Home() {
  const { likedIds, watchlistIds } = useLibrary()
  const { profile } = useAuth()
  const { preview } = usePreview()
  const { data: newReleases } = useFetch('/api/movies?sort=now_playing')
  const featured = newReleases?.results?.[0]
  return (
    <div className="page home spotify-home">
      <div className="home-pills">
        <Link className="chip selected" href="/movies">
          ภาพยนตร์
        </Link>
        <Link className="chip" href="/library?tab=liked">
          หนังที่ถูกใจ
        </Link>
        <Link className="chip" href="/library?tab=watchlist">
          อยากดู
        </Link>
      </div>
      <div className="home-heading">
        <span className="eyebrow">YOUR CINEMA, YOUR WAY</span>
        <h1>
          {profile
            ? 'ยินดีต้อนรับกลับ, ' + profile.display_name
            : 'วันนี้อยากดูเรื่องไหน?'}
        </h1>
        <p>ค้นพบเรื่องใหม่ เก็บเรื่องที่รัก สร้างรสนิยมบนชั้นของคุณ</p>
      </div>
      <div className="quick-shelves">
        <Link href="/library?tab=liked">
          <span className="liked-cover">
            <Icon name="heart" size={30} />
          </span>
          <div>
            <strong>หนังที่ถูกใจ</strong>
            <small>{likedIds.size} เรื่องบนชั้นของคุณ</small>
          </div>
          <Icon name="arrow" />
        </Link>
        <Link href="/library?tab=watchlist">
          <span className="watch-cover">
            <Icon name="bookmark" size={30} />
          </span>
          <div>
            <strong>รายการอยากดู</strong>
            <small>{watchlistIds.size} เรื่องสำหรับครั้งหน้า</small>
          </div>
          <Icon name="arrow" />
        </Link>
      </div>
      {featured && (
        <section className="featured-release">
          <div className="featured-label">
            <span className="eyebrow">NEW ON THE BIG SCREEN</span>
            <h2>เรื่องใหม่ที่น่าจับตา</h2>
          </div>
          <div className="featured-body">
            {featured.poster_path && (
              <img
                src={getPosterUrl(featured.poster_path, 'w342')}
                alt={'โปสเตอร์ ' + featured.title}
              />
            )}
            <div>
              <span className="muted">
                ภาพยนตร์ · {featured.release_date?.slice(0, 4)}
              </span>
              <Link href={'/movies/' + featured.id}>
                <h3>{featured.title}</h3>
              </Link>
              <p>
                {featured.overview ||
                  'ค้นพบเรื่องราวและตัวอย่างของภาพยนตร์เรื่องนี้'}
              </p>
              <button
                className="round-play"
                aria-label={'เลือกตัวอย่างเรื่องแนะนำ ' + featured.title}
                onClick={() => preview(featured)}
              >
                <Icon name="play" />
              </button>
            </div>
          </div>
        </section>
      )}
      {collections.map(([category, title, subtitle]) => (
        <section className="film-shelf" key={category}>
          <div className="section-heading">
            <div>
              <h2>{title}</h2>
              <p>{subtitle}</p>
            </div>
            <Link className="text-link" href={'/movies?sort=' + category}>
              ดูทั้งหมด
            </Link>
          </div>
          <MovieCollection category={category} />
        </section>
      ))}
      <section className="film-shelf">
        <div className="section-heading">
          <h2>เลือกตามอารมณ์</h2>
          <Link className="text-link" href="/movies">
            ทุกประเภท
          </Link>
        </div>
        <div className="mood-grid">
          {moods.map(([genre, name, color]) => (
            <Link
              className={'mood-card ' + color}
              key={genre}
              href={'/movies?genre=' + genre}
            >
              <strong>{name}</strong>
              <Icon name="film" size={64} />
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
