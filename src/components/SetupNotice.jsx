export default function SetupNotice() {
  return (
    <section className="page setup-notice">
      <h1>ยังไม่ได้ตั้งค่า Supabase</h1>
      <p>ยังไม่มีค่า หรือ URL ไม่ถูกต้อง (ต้องขึ้นต้นด้วย https://)</p>
      <p>
        ใส่ค่าต่อไปนี้ในไฟล์ <code>.env</code> ที่โฟลเดอร์โปรเจกต์
        แล้วหยุดและรัน <code>npm run dev</code> ใหม่
      </p>
      <pre>
        NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co{'\n'}
        NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
      </pre>
      <p>ขั้นตอนสร้างโปรเจกต์อยู่ใน README หัวข้อ “ตั้งค่า Supabase”</p>
    </section>
  )
}
