import Link from 'next/link'
import { getBackdropUrl } from '../services/tmdb.ts'
import HeroSearch from '../components/HeroSearch'
import DiscoveryRoom from '../components/DiscoveryRoom'
import Icon from '../components/Icon'
// Server Component: data comes from app/page.jsx; search and category tabs are client islands.
export default function Home({ featured, trending }) {
  return (
    <div className="page home">
      <section className="hero">
        <div
          className="hero-photo"
          style={{
            backgroundImage: featured?.backdrop_path
              ? `url("${getBackdropUrl(featured.backdrop_path)}")`
              : undefined,
          }}
        />
        <div className="hero-shade" />
        <div className="hero-content">
          <span className="eyebrow">
            <span className="live-dot" /> YOUR PERSONAL FILM COLLECTION
          </span>
          <h1>
            เรื่องราวที่คุณรัก
            <br />
            เก็บไว้บน<span>ชั้นของคุณ.</span>
          </h1>
          <p>
            บางเรื่องดูจบ แต่ยังอยู่ในใจ
            <br />
            ค้นพบ เก็บสะสม และแชร์หนังเรื่องโปรดให้คนที่คุณรัก
          </p>
          <HeroSearch />
          <div className="hero-hint">
            <span>มากกว่าลิสต์หนัง</span>
            <span className="dot-separator">•</span>พื้นที่เล็ก ๆ
            สำหรับรสนิยมของคุณ
          </div>
        </div>
        <Link href="/movies/157336" className="hero-caption">
          <span className="hero-caption-label">ON THE BIG SCREEN</span>
          <strong>{featured?.original_title || 'CINESHELF'}</strong>
          <span>
            {featured?.release_date?.slice(0, 4)} <span>·</span>{' '}
            {featured?.credits?.crew?.find((p) => p.job === 'Director')?.name}{' '}
            <Icon name="arrow" size={16} />
          </span>
        </Link>
        <span className="hero-index">
          01 <span>/ YOUR NEXT FAVORITE</span>
        </span>
      </section>
      <section className="discovery-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">THE DISCOVERY ROOM</span>
            <h2>
              เรื่องต่อไปที่อาจกลายเป็นเรื่องโปรด
              <span className="accent">.</span>
            </h2>
          </div>
          <Link className="text-link" href="/movies">
            สำรวจหนังทั้งหมด <Icon name="arrow" size={18} />
          </Link>
        </div>
        <DiscoveryRoom initial={trending} />
      </section>
      <section className="shelf-invite">
        <div className="invite-icon">
          <Icon name="shelf" size={38} />
        </div>
        <div>
          <span className="eyebrow">A LITTLE MORE YOU</span>
          <h2>หนังที่ชอบ บอกความเป็นคุณ</h2>
          <p>สร้างห้องสมุดของคุณ แล้วส่งต่อเรื่องราวดี ๆ ให้เพื่อน</p>
        </div>
        <Link href="/library" className="button secondary">
          ไปที่ห้องสมุดของฉัน <Icon name="arrow" />
        </Link>
      </section>
    </div>
  )
}
