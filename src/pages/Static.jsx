import { Link } from 'react-router-dom'
export function NotFound() {
  return (
    <div className="empty not-found">
      <span className="eyebrow">404 · SCENE NOT FOUND</span>
      <h1>ดูเหมือนจะหลงโรงแล้ว</h1>
      <p>ไม่พบหน้าที่คุณกำลังมองหา</p>
      <Link to="/" className="button primary">
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
        รายการและบันทึกส่วนตัวเก็บใน localStorage ของเบราว์เซอร์นี้
        แยกตามบัญชีและผู้เยี่ยมชม คะแนน รีวิว วันที่ดู และเพลย์ลิสต์ไม่ถูกแชร์
        เมื่อเข้าสู่ระบบและเปิดแชร์ ผู้ที่มีลิงก์จะเห็นชื่อที่แสดงและรายชื่อหนัง
        โดยไม่เห็นอีเมลหรือข้อมูลบัญชี ปิดแชร์เพื่อยกเลิกลิงก์เดิมได้ทุกเมื่อ
      </p>
      <h2>โปรเจกต์เพื่อการเรียนรู้</h2>
      <p>
        สร้างด้วย React, React Router, Context, custom hooks และ react-hook-form
        + zod พร้อมเซิร์ฟเวอร์ Node.js และฐานข้อมูล SQLite
        สำหรับบัญชีและห้องสมุด
      </p>
    </article>
  )
}
