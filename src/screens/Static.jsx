import Link from 'next/link'
export function NotFound() {
  return (
    <div className="empty not-found">
      <span className="eyebrow">404 · SCENE NOT FOUND</span>
      <h1>ดูเหมือนจะหลงโรงแล้ว</h1>
      <p>ไม่พบหน้าที่คุณกำลังมองหา</p>
      <Link href="/" className="button primary">
        กลับหน้าแรก
      </Link>
    </div>
  )
}
export function About() {
  return (
    <article className="page prose inner-page">
      <span className="eyebrow">BEHIND THE SHELF</span>
      <h1>
        เกี่ยวกับ CineShelf<span className="accent">.</span>
      </h1>
      <p>
        ห้องสมุดภาพยนตร์ส่วนตัวสำหรับค้นหา เก็บเรื่องโปรด และส่งต่อให้เพื่อน
        เว็บนี้รวบรวมข้อมูลภาพยนตร์ ไม่ใช่บริการสตรีมมิง
      </p>
      <h2>ข้อมูลและภาพประกอบ</h2>
      <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer">
        <img
          className="tmdb-logo"
          src="/tmdb.svg"
          alt="The Movie Database (TMDB)"
        />
      </a>
      <p>
        This product uses the TMDB API but is not endorsed or certified by TMDB.
      </p>
      <p>
        ข้อมูลหนังมาจาก TMDB โดยใช้ภาษาไทยเมื่อมีข้อมูล
        และเรื่องย่อภาษาอังกฤษเมื่อยังไม่มีคำแปล
      </p>
      <h2>ห้องสมุดและการแชร์</h2>
      <p>
        Like และรายการอยากดูเก็บใน Supabase แยกตามบัญชี
        เมื่อเปิดโปรไฟล์เป็นสาธารณะ เพื่อนจะเห็นเฉพาะหนังที่ถูกใจ
        รายการอยากดูและอีเมลไม่ถูกแชร์
        เปลี่ยนเป็นส่วนตัวเพื่อปิดการเข้าถึงได้ทุกเมื่อ
      </p>
      <h2>ไอคอน</h2>
      <p>
        Uicons by{' '}
        <a
          href="https://www.flaticon.com/uicons"
          target="_blank"
          rel="noreferrer"
        >
          Flaticon
        </a>
      </p>
      <h2>โปรเจกต์เพื่อการเรียนรู้</h2>
      <p>
        สร้างด้วย Next.js App Router, React, Context, custom hooks และ react-hook-form
        + zod โดย API ทำงานผ่าน Next.js Route Handlers และใช้ Supabase สำหรับบัญชีและห้องสมุด
      </p>
    </article>
  )
}
