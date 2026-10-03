# CineShelf — ห้องสมุดหนังเรื่องโปรด

โปรเจกต์ใหม่ที่อิงพื้นฐาน React จาก `assignment-01-start-2` ใช้ธีมโรงหนังโทนมืด ค้นหาหนัง กดถูกใจหรือเก็บไว้ดูทีหลังแยกตามบัญชี และแชร์ลิงก์โปรไฟล์ให้เพื่อนเห็นหนังที่ถูกใจ โดยเลือกได้ว่าโปรไฟล์เป็นสาธารณะหรือส่วนตัว

## เริ่มรัน

ใช้ **Node.js 22.13 ขึ้นไป** (ทดสอบกับ Node.js 24.19.0)

```bash
cd /Users/pordiewtrakul/Downloads/movie-library
npm install
npm run dev
```

เปิด **http://localhost:5175** คำสั่งเดียวเปิดทั้ง React และ API server ที่พอร์ต 3001 ใช้พอร์ต 5175 แยกจากงานเดิม

ถ้ายังไม่ใส่ TMDB key จะใช้ชุดตัวอย่างหนัง 12 เรื่องพร้อมป้าย “โหมดตัวอย่าง” ไม่ได้สร้างบัญชีหรือรหัสผ่านเริ่มต้นไว้ให้

บัญชี โปรไฟล์ และห้องสมุดเก็บใน Supabase ต้องตั้งค่าตามหัวข้อ “ตั้งค่า Supabase” ก่อน ถ้ายังไม่ตั้ง แอปจะแสดงวิธีตั้งค่าแทน รูปภาพและฟอนต์ต้องใช้อินเทอร์เน็ต

## ตั้งค่า Supabase

1. สมัคร/เข้าสู่ระบบที่ [Supabase](https://supabase.com) → **New project** (region: Southeast Asia (Singapore))
2. **Authentication → Sign In / Providers**: ส่วน User Signups ปิด **Confirm email** และในรายการ Auth Providers ต้องเปิด **Email** ไว้ → Save
3. **SQL Editor → New query** วางเนื้อหาไฟล์ `supabase/schema.sql` ทั้งไฟล์ → **Run** (รันซ้ำได้)
4. **Project Settings → API** คัดลอก Project URL และ anon/publishable key ใส่ใน `.env`:

   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=...
   ```

   anon/publishable key อยู่ในเบราว์เซอร์ได้ สิทธิ์ข้อมูลบังคับด้วย Row Level Security ส่วน `SUPABASE_SERVICE_ROLE_KEY` ใส่เฉพาะเมื่อจะรันเทสต์ RLS/browser ห้ามขึ้นต้นด้วย `VITE_` และห้าม commit

## เชื่อมข้อมูลหนังจริงจาก TMDB

1. สมัคร/เข้าสู่ระบบที่ [TMDB](https://www.themoviedb.org/)
2. ไปที่ [Settings → API](https://www.themoviedb.org/settings/api) สมัครใช้งาน API และคัดลอก **API Read Access Token** (ข้อความยาว ไม่ใช่ API Key แบบสั้น)
3. คัดลอกไฟล์ตัวอย่าง:

   ```bash
   cp .env.example .env
   ```

4. เปิด `.env` ใน editor ใส่ `TMDB_READ_TOKEN=โทเคนของคุณ` หรือใช้ API Key (v3) แบบสั้นด้วย `TMDB_API_KEY=คีย์ของคุณ` แล้วหยุด/เริ่ม `npm run dev` ใหม่

Token อยู่ฝั่งเซิร์ฟเวอร์เท่านั้น ไม่ใช้ `VITE_` และไม่ส่งไปยังเบราว์เซอร์ `.env` ถูกละเว้นใน `.gitignore` ไม่ต้องส่ง token ในแชต

เมื่อมี token แอปจะเรียก TMDB จริง ป้ายโหมดตัวอย่างจะหายไป ถ้า token ผิดหรือ API ล่มจะแสดงข้อผิดพลาดพร้อมให้ลองใหม่ ไม่สลับกลับไปใช้ข้อมูลตัวอย่างโดยไม่แจ้ง

### API ที่ใช้

| งาน                             | TMDB endpoint                                    |
| ------------------------------- | ------------------------------------------------ |
| สำรวจ / กรองประเภท / เรียงคะแนน | `/3/discover/movie`                              |
| ค้นหาชื่อภาษาไทยหรืออังกฤษ      | `/3/search/movie`                                |
| ประเภทหนัง                      | `/3/genre/movie/list`                            |
| รายละเอียด นักแสดง และวิดีโอ    | `/3/movie/:id?append_to_response=credits,videos` |

ค้นหาตามชื่อเมื่อกดส่งฟอร์ม ไม่ยิง API ทุกตัวอักษร ประเภทและการเรียงใช้เมื่อสำรวจโดยไม่มีคำค้น เพราะ TMDB search ไม่รองรับตัวกรองแบบ discover รายการแบ่งหน้าครั้งละตามที่ TMDB ส่งมา และจำกัดหน้าไม่เกิน 500

ขอข้อมูลภาษาไทย ถ้าไม่มีเรื่องย่อภาษาไทยจะแสดงข้อความบอก วิดีโอตัวอย่างแสดงเมื่อมี YouTube trailer ในผลลัพธ์นั้น มีหน้าเครดิตพร้อมโลโก้ TMDB ที่ `/about`

เอกสารอ้างอิง: [Getting started](https://developer.themoviedb.org/docs/getting-started), [Authentication](https://developer.themoviedb.org/docs/authentication-application), [Search](https://developer.themoviedb.org/docs/search-and-query-for-details), [Attribution](https://developer.themoviedb.org/docs/faq)

## วิธีแชร์ให้เพื่อน

1. สมัครสมาชิกหรือเข้าสู่ระบบ กด ♥ ที่หนังเรื่องที่ชอบ (🔖 คือเก็บไว้ดูทีหลัง)
2. เปิด **ตั้งค่าโปรไฟล์ → เปิดเป็นสาธารณะ → คัดลอกลิงก์** (`/u/ชื่อผู้ใช้`)
3. เพื่อนเห็นชื่อที่แสดงและหนังที่คุณกดถูกใจ ไม่เห็นรายการอยากดู ไม่เห็นอีเมล ไม่ต้องล็อกอิน และแก้อะไรไม่ได้
4. เปลี่ยนเป็นส่วนตัวแล้วลิงก์ใช้ไม่ได้ทันที คนอื่นจะเห็นว่า “ไม่พบโปรไฟล์ หรือโปรไฟล์นี้เป็นส่วนตัว” · เปลี่ยนชื่อผู้ใช้แล้วลิงก์เก่าจะใช้ไม่ได้

**ลิงก์ localhost เปิดได้เฉพาะเครื่องตัวเอง** ถ้าอยู่ Wi-Fi เดียวกัน ให้เจ้าของเปิดเว็บผ่าน Network URL ที่ Vite แสดง เช่น `http://192.168.x.x:5175` ก่อนคัดลอกลิงก์ เครื่องเจ้าของต้องเปิดเซิร์ฟเวอร์และอนุญาตการเชื่อมต่อผ่าน firewall เครือข่ายบางแห่งอาจปิดการติดต่อระหว่างเครื่อง

สำหรับเพื่อนนอกเครือข่าย ต้องนำ React และ Node server ไป deploy ก่อน (ข้อมูลอยู่ใน Supabase อยู่แล้ว ไม่ต้องมี disk ถาวร) โปรเจกต์นี้ยังไม่ได้ deploy

```bash
npm run build
npm start
```

Production server ส่งทั้งไฟล์ React ใน `dist` และ `/api` จาก origin เดียวกัน ตั้ง `APP_ORIGIN=https://โดเมนจริง` และ `TMDB_READ_TOKEN` ใน environment ของโฮสต์ ส่วน `VITE_SUPABASE_URL` กับ `VITE_SUPABASE_ANON_KEY` ต้องมีตอน `npm run build` เพราะ Vite ฝังค่าลงในไฟล์ React ตอน build และต้องเพิ่มโดเมนจริงใน Supabase → Authentication → URL Configuration

## โครงสร้างและพื้นฐานที่ใช้

```text
src/
  components/  Layout, MovieCard, LibraryButtons (♥/🔖), SetupNotice, สถานะ loading/error/empty
  context/     AuthContext และ LibraryContext
  hooks/       useFetch — โหลดข้อมูล + cleanup + retry
  pages/       Home, Movies, MovieDetail, Library, Profile, ProfileSettings, Auth, Static
  schemas/     auth.js — zod schema ของฟอร์มและ username
  lib/         api.js (fetch + helper รูป/ปี), supabase.js (client),
               library.js (toggle/rollback แบบ pure), profiles.js, supabaseErrors.js
  index.css    ธีม Responsive + Tailwind import
server/
  index.js     Node HTTP server, TMDB proxy, เสิร์ฟ dist
  movies.js    เชื่อม TMDB จากเซิร์ฟเวอร์
  demo.js      ชุดตัวอย่าง 12 เรื่อง
supabase/
  schema.sql   ตาราง profiles/library_items, trigger, RLS, username_available
tests/         unit, TMDB adapter, RLS (Supabase จริง) และ browser checks
```

| แนวคิดจากงานเดิม                | ใน CineShelf                                                      |
| ------------------------------- | ----------------------------------------------------------------- |
| Components / props / list + key | MovieCard ใช้ซ้ำในหน้าสำรวจ ห้องสมุด และหน้าแชร์                  |
| useState + controlled inputs    | ช่องค้นหาหน้าแรกและค้นหาในห้องสมุด                                |
| useEffect + custom hook         | useFetch จัดการ loading / error / cleanup / retry                 |
| React Router                    | Layout + Outlet, Link/NavLink, useParams, useSearchParams, 404    |
| Context + custom hook           | useAuth / useLibrary ส่งข้อมูลร่วมหลายหน้า                        |
| react-hook-form + zod           | สมัครสมาชิก / ล็อกอิน / ตั้งค่าโปรไฟล์ ตรวจฟอร์มก่อนส่ง Supabase |
| เก็บข้อมูลหลัง refresh          | Supabase (Postgres + RLS) รองรับหลายบัญชีและการแชร์ข้ามเครื่อง   |

### State อยู่ที่ไหน ทำไม

- คำค้น ประเภท การเรียง และหน้าอยู่ใน URL ผ่าน `useSearchParams` เปิดลิงก์เดิมแล้วได้การค้นหาเดิม ใช้ `replace` ตอนเปลี่ยนตัวกรอง ไม่สร้าง history ทุกตัวอักษร ช่องชื่อหนังในหน้าสำรวจเป็น draft ของฟอร์มแบบ uncontrolled แล้วค่อย commit เข้า URL ตอน submit จึงไม่มี useState คำค้นซ้ำกับ URL
- **AuthContext** เก็บ session และ profile (username, ชื่อที่แสดง, สาธารณะ/ส่วนตัว) ฟัง `onAuthStateChange` ของ Supabase เพื่ออัปเดตเมื่อล็อกอิน/ล็อกเอาต์หรือ session หมดอายุ
- **LibraryContext** เก็บแถว `library_items` ของตัวเองชุดเดียว `likedIds` และ `watchlistIds` คำนวณจากชุดนี้ ไม่เก็บ state ซ้ำ กดปุ่มแล้วเปลี่ยนทันที (optimistic) ถ้าบันทึกพลาดจะย้อนเฉพาะรายการนั้นด้วย `revertToggle` เปลี่ยนบัญชีแล้วรีเซ็ต LibraryProvider ด้วย key เพื่อไม่ให้เห็นข้อมูลบัญชีเดิม
- หน้าโปรไฟล์ `/u/:username` โหลดข้อมูลของคนอื่นแยกในหน้านั้นเอง ไม่ใช้ LibraryContext
- ไม่ใช้ Redux/Zustand เพราะ state ที่ใช้ร่วมกันทั้งแอปมีแค่ user/profile และรายการหนังของตัวเอง

### ส่วนที่เพิ่มจากพื้นฐานงานเดิม

งานเดิมเป็น frontend และไม่ได้ต้องมีบัญชีจริง งานนี้ใช้ Supabase Auth จัดการรหัสผ่านและ session ส่วนสิทธิ์ข้อมูลบังคับด้วย Row Level Security ในฐานข้อมูล (ดู `supabase/schema.sql`) Node server เหลือหน้าที่เก็บ TMDB key และ proxy ข้อมูลหนัง

ยังไม่มี email verification, ลืมรหัสผ่าน, เปลี่ยนรหัสผ่าน หรือระบบจัดการบัญชี นี่เป็นโปรเจกต์เรียนรู้และต้นแบบ ยังไม่ได้ผ่านการตรวจเพื่อเปิดบริการสาธารณะขนาดใหญ่

**เป็นงานต่อยอดธีมหนัง ไม่ใช่คำตอบแทนโจทย์ Pokémon ทุกข้อ** เช่น ไม่มีทีม 6 ตัว/เงื่อนไขลงทะเบียนทีม 3 ตัว เพราะเปลี่ยนเป็นห้องสมุดกับบัญชีตามขอบเขตใหม่นี้

## ตรวจสอบ

```bash
npm test
npm run build
```

Unit test ตรวจ logic กดถูกใจ/ย้อนกลับ, การแปล error ของ Supabase, schema ฟอร์ม/username และการอ่าน env ส่วน server test ตรวจ search/filter/detail/error และยืนยันว่า route บัญชีแบบเก่าไม่มีแล้ว

`tests/rls.test.js` รันกับ Supabase จริงเมื่อ `.env` มี `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` และ `SUPABASE_SERVICE_ROLE_KEY` ครบ จะสร้าง user ทดสอบ 2 คนแล้วลบทิ้งเอง ตรวจว่าโปรไฟล์ส่วนตัวไม่มีใครเห็น, สาธารณะเห็นเฉพาะถูกใจ, แก้ข้อมูลคนอื่นไม่ได้ ถ้า env ไม่ครบจะแสดง SKIP พร้อมเหตุผล (**SKIP ไม่ได้แปลว่าผ่าน**)

ทดสอบ adapter TMDB ด้วย mock HTTP เพื่อยืนยัน request และ error handling **ยังไม่ได้ทดสอบ live TMDB เพราะยังไม่มี token**

ทดสอบเบราว์เซอร์เพิ่มเติมได้หลัง build:

```bash
npm install --no-save --package-lock=false playwright
npx playwright install chromium
node tests/browser.mjs
```

ต้องมี Supabase จริงเหมือนเทสต์ RLS (รันด้วย `node --env-file=.env tests/browser.mjs`) สร้างภาพ desktop/mobile ใน `test-results/` ตรวจสมัคร กดถูกใจ/อยากดู โปรไฟล์ส่วนตัว/สาธารณะเมื่อเปิดเป็น guest และหน้าจอมือถือไม่ล้นแนวนอน

เวลาส่งงานไม่รวม `node_modules`, `.env`, `test-results` เพราะมีขนาดใหญ่หรือเป็นข้อมูลส่วนตัว
