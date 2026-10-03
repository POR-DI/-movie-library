# CineShelf → Supabase + แชร์โปรไฟล์แบบ Spotify — Design

วันที่: 2026-10-03 · สถานะ: รอผู้ใช้รีวิว

## 1. เป้าหมาย

ทำให้โค้ดตรงกับ `PROPOSAL-BASIC.md` ฉบับใหม่:

- ย้ายบัญชีและข้อมูลห้องสมุดจาก SQLite + localStorage ไป **Supabase (Auth + Postgres)**
- ผู้ใช้กด **ถูกใจ** หรือ **อยากดู** หนังได้
- แชร์ลิงก์โปรไฟล์ `/u/:username` ให้เพื่อนเห็นหนังที่กดถูกใจ เจ้าของเลือกได้ว่าจะเป็น **สาธารณะ** หรือ **ส่วนตัว**
- global state ใช้ React Context 2 ตัว (`AuthContext`, `LibraryContext`)

### เกณฑ์ว่าเสร็จ

1. สมัคร (อีเมล + รหัสผ่าน + username + ชื่อที่แสดง) แล้วล็อกอินได้ทันที ไม่ต้องยืนยันอีเมล
2. กด ♥ / 🔖 บนการ์ดและหน้ารายละเอียดได้ รีเฟรชหรือเปิดจากเครื่องอื่นแล้วยังอยู่
3. เปิดโปรไฟล์เป็นสาธารณะ แล้วเบราว์เซอร์ที่ไม่ได้ล็อกอินเปิด `/u/:username` เห็นรายการถูกใจ แต่ไม่เห็นรายการอยากดูและไม่เห็นอีเมล
4. เปลี่ยนกลับเป็นส่วนตัวแล้ว ลิงก์เดิมแสดง "ไม่พบโปรไฟล์ หรือโปรไฟล์นี้เป็นส่วนตัว" ทันที
5. `tests/rls.test.js` ผ่านเมื่อรันกับโปรเจกต์ Supabase จริง และเคยแดงเมื่อทำให้ policy หลวมโดยตั้งใจ
6. `npm test` และ `npm run build` ผ่าน

## 2. การตัดสินใจที่ตกลงแล้ว

| เรื่อง | เลือก | เหตุผล |
| --- | --- | --- |
| ฟีเจอร์ที่ไม่อยู่ใน schema (คะแนน รีวิว เพลย์ลิสต์ ดูแล้ว guest mode) | **ตัดออก** | ตรงกับ proposal และตัดการซิงก์ localStorage ↔ server ที่ซับซ้อน |
| Framework | Vite + React Router ต่อ | วิชาไม่บังคับ Next.js |
| สถาปัตยกรรม | Client → Supabase ตรง (RLS) · Node server เหลือแค่ proxy TMDB | ตรวจสิทธิ์ที่เดียวในฐานข้อมูล · TMDB key ไม่หลุดไปเบราว์เซอร์ |
| ยืนยันอีเมล | **ปิด** | เดโมลื่น · เลี่ยง rate limit อีเมลของ Supabase แบบฟรี |
| ความหมาย "ส่วนตัว" | เจ้าของเห็นคนเดียว | ไม่ใช่ unlisted |
| เพื่อนเห็นอะไร | เฉพาะ `liked` | watchlist เป็นของส่วนตัว |
| ลิงก์แชร์เดิม `/s/:token` | ลบ แทนด้วย `/u/:username` | มีระบบแชร์ทางเดียว |
| ข้อมูลเดิมใน SQLite | ไม่ย้าย | ตรวจแล้วมี 0 users / 0 favorites |
| เก็บ `title`, `poster_path` ซ้ำใน `library_items` | เก็บ | หน้าห้องสมุด/โปรไฟล์ไม่ต้องยิง TMDB ทีละเรื่อง · ยอมรับว่าชื่อจะไม่อัปเดตตาม TMDB |
| แก้ username | แก้ได้ · เตือนว่าลิงก์เก่าจะใช้ไม่ได้ | ไม่ทำ redirect จากชื่อเก่า |
| Supabase project | ยังไม่มี · ผู้ใช้สร้างเองตามขั้นตอนใน README | |
| Version control | `git init` + commit สถานะปัจจุบันก่อนเริ่มแก้ | ทุก commit ถามก่อน · email `pordiewtrakul@gmail.com` |
| ลบ user ทดสอบ | ใช้ `SUPABASE_SERVICE_ROLE_KEY` เฉพาะใน tests | ไม่มี prefix `VITE_` · ไม่ถูก bundle |

## 3. สถาปัตยกรรม

```
React (Vite) ──supabase-js + anon key──► Supabase Auth + Postgres (RLS)
React ──/api/movies, /api/genres──────► Node server ──► TMDB
```

## 4. ฐานข้อมูล — `supabase/schema.sql`

ไฟล์เดียว รันใน SQL Editor ได้ทันที เนื้อหาตาม `PROPOSAL-BASIC.md` ข้อ 4 บวก:

- `username_available(name text) returns boolean` — `security definer`, `stable`, เปิด `execute` ให้ `anon` และ `authenticated` ใช้เช็คก่อนส่งฟอร์มสมัครและหน้าตั้งค่า
- policy `update own profile` คงเดิม (แก้ `username`, `display_name`, `avatar_url`, `is_public` ได้) · `id` และ `created_at` ห้ามแก้ (ใช้ column-level `grant update (...)`)
- ไม่มี policy insert/delete บน `profiles` จาก client — สร้างผ่าน trigger, ลบผ่าน cascade จาก `auth.users`

ตาราง:

- `profiles(id uuid pk → auth.users, username unique check ^[a-z0-9_]{3,20}$, display_name 1–50, avatar_url, is_public default false, created_at)`
- `library_items(id, user_id → profiles, tmdb_movie_id, kind in ('liked','watchlist'), title, poster_path, created_at, unique(user_id, tmdb_movie_id, kind))`

RLS:

- `profiles` select: `is_public or id = auth.uid()`
- `library_items` select: `user_id = auth.uid() or (kind = 'liked' and เจ้าของ is_public)`
- `library_items` insert/delete: `user_id = auth.uid()`

## 5. Frontend

### ไฟล์ใหม่

| ไฟล์ | หน้าที่ |
| --- | --- |
| `src/lib/supabase.js` | สร้าง client ตัวเดียว · export `supabaseConfigured` (boolean) |
| `src/lib/supabaseErrors.js` | `toThaiMessage(error)` แปล error ของ Supabase เป็นข้อความไทย · ไม่รู้จัก → ข้อความกลาง |
| `src/lib/library.js` | pure functions: `idsOf(items, kind)`, `applyToggle(items, movie, kind, userId)`, ใช้ทั้ง context และ unit test |
| `src/pages/ProfileSettings.jsx` | `/settings/profile` — แก้ username/ชื่อที่แสดง, สวิตช์สาธารณะ, คัดลอกลิงก์ · ต้องล็อกอิน |
| `src/pages/Profile.jsx` | `/u/:username` — query `profiles` by username → `library_items` kind=liked · ไม่พบหรือส่วนตัว → ข้อความเดียวกัน |
| `src/components/SetupNotice.jsx` | แสดงเมื่อ `supabaseConfigured === false` บอกวิธีตั้ง `.env` |
| `supabase/schema.sql` | ตามข้อ 4 |

### Context

`AuthContext`

- state: `session`, `profile`, `loading`, `error` · `user` derive จาก `session?.user`
- `signUp({ email, password, username, displayName })` → `supabase.auth.signUp` ส่ง username/display_name ใน `options.data`
- `signIn({ email, password })`, `signOut()`, `updateProfile(patch)`
- subscribe `onAuthStateChange` → โหลด `profile` เมื่อ user เปลี่ยน · unsubscribe ตอน unmount

`LibraryContext`

- state: `items` (แถว `library_items` ของตัวเอง), `loading`, `error`
- derive: `likedIds`, `watchlistIds` (Set) ด้วย `idsOf`
- `has(id, kind)`, `toggle(movie, kind)` — optimistic: อัปเดต `items` ทันที → insert/delete → พลาดแล้ว rollback + ตั้ง `error`
- ไม่ล็อกอิน: `items = []`, `toggle` ไม่ถูกเรียก (ปุ่มพาไป `/login`)
- `main.jsx` ยังครอบด้วย `key={user?.id || 'guest'}` เพื่อรีเซ็ตเมื่อเปลี่ยนบัญชี

### ไฟล์ที่แก้

- `App.jsx` — เพิ่ม `/settings/profile`, `/u/:username` · ลบ `/s/:token`
- `MovieCard.jsx`, `MovieDetail.jsx` — ปุ่ม ♥ ถูกใจ และ 🔖 อยากดู · ไม่ล็อกอิน → `Link` ไป `/login`
- `Library.jsx` — แท็บ ถูกใจ / อยากดู + ค้นหาในห้องสมุด · ลบส่วนแชร์และเพลย์ลิสต์
- `Auth.jsx`, `schemas/auth.js` — `name` → `displayName`, เพิ่ม `username` (regex ตรงกับ SQL) · เช็ค `username_available` ก่อนส่ง
- `Layout.jsx` — เมนูผู้ใช้: โปรไฟล์ของฉัน, ตั้งค่า, ออกจากระบบ · ตัวนับใช้ `likedIds.size`
- `server/index.js` — ลบ SQLite, users, sessions, favorites, sharing, origin/rate-limit ของ auth · คง TMDB routes และการเสิร์ฟ `dist`
- `.env.example` — เพิ่ม `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (มีหมายเหตุว่าใช้เฉพาะเทสต์)
- `package.json` — เพิ่ม `@supabase/supabase-js`
- `README.md` — ขั้นตอนสร้างโปรเจกต์ Supabase (สร้าง project → ปิด Confirm email → รัน `schema.sql` → คัดลอก URL/anon key) · ลบส่วน SQLite/แชร์เดิม
- `PROPOSAL-BASIC.md` — เพิ่ม `username_available` และชี้ไป `supabase/schema.sql`

### ไฟล์ที่ลบ

`src/pages/Shared.jsx`, `src/components/PersonalMovieEditor.jsx`, `src/storage/portfolio.ts`, `data/` (SQLite)

## 6. Error handling

- ทุก error จาก Supabase ผ่าน `toThaiMessage` ก่อนแสดง
- username ชนตอนสมัคร (race หลังเช็คแล้ว) → trigger error → แปลเป็น "ชื่อผู้ใช้นี้ถูกใช้แล้ว"
- toggle พลาด → rollback + แจ้งเตือน
- ไม่มี env → `SetupNotice` แทนแอป ไม่ใช่หน้าขาว
- TMDB error คงพฤติกรรมเดิม

## 7. การทดสอบ

| ชั้น | ไฟล์ | ต้องการ |
| --- | --- | --- |
| Unit | `tests/auth-schema.test.js`, `tests/supabase-errors.test.js`, `tests/library.test.js` | ไม่มี |
| TMDB/server | `tests/server.test.js` (ตัดส่วน auth/share), `tests/tmdb.test.ts`, `tests/movies.test.js` | ไม่มี (mock) |
| RLS | `tests/rls.test.js` | Supabase จริง + service key |
| Browser | `tests/browser.mjs` (เขียน flow ใหม่) | Supabase จริง + Playwright |

`tests/rls.test.js`:

- ไม่มี env → `skip` พร้อมเหตุผล (ไม่นับว่าผ่าน)
- สร้าง user A, B ด้วย admin API (`email_confirm: true`) · ลบใน `after()`
- กรณี: B เห็น liked ของ A เมื่อสาธารณะ · B ไม่เห็นเมื่อส่วนตัว · anon ไม่เห็นเมื่อส่วนตัว · B ไม่เห็น watchlist ของ A ไม่ว่ากรณีใด · B insert/delete แถวของ A ไม่ได้ · B update profile ของ A ไม่ได้ · A เปลี่ยนเป็นส่วนตัวแล้วผลเปลี่ยนทันที · `username_available` ถูกต้อง
- พิสูจน์ว่าเทสต์จับได้จริง: ทำให้ policy select หลวม (`using (true)`) ชั่วคราว → ต้องแดง → คืนค่า

## 8. นอกขอบเขต

ยืนยันอีเมล, ลืมรหัสผ่าน, อัปโหลดรูปโปรไฟล์ (มีแค่ช่อง `avatar_url`), ระบบ follow, redirect username เก่า, deploy
