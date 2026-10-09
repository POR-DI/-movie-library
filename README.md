# CineShelf — ห้องสมุดหนังเรื่องโปรด

โปรเจกต์ **Next.js App Router + React** ใช้ UI แนว Spotify สำหรับหนัง มี sidebar ห้องสมุด แถวคอลเลกชันแนวนอน เมนูด้านล่างบนมือถือ และแถบตัวอย่างหนัง ค้นหาหนัง กดถูกใจหรือเก็บไว้ดูทีหลังแยกตามบัญชี และแชร์ลิงก์โปรไฟล์ให้เพื่อนเห็นหนังที่ถูกใจ โดยเลือกได้ว่าโปรไฟล์เป็นสาธารณะหรือส่วนตัว

## เริ่มรัน

ใช้ **Node.js 22.13 ขึ้นไป** (ทดสอบกับ Node.js 24.19.0)

```bash
cd /Users/floridae/movie-library
npm install
npm run dev
```

เปิด **http://localhost:5175** คำสั่งเดียวเปิด Next.js ทั้งหน้าเว็บและ Route Handlers `/api` ที่พอร์ต 5175 ไม่มีเซิร์ฟเวอร์ API แยก

ถ้ายังไม่ใส่ TMDB key จะใช้ชุดตัวอย่างหนัง 12 เรื่องพร้อมป้าย “โหมดตัวอย่าง” ไม่ได้สร้างบัญชีหรือรหัสผ่านเริ่มต้นไว้ให้

บัญชี โปรไฟล์ และห้องสมุดเก็บใน Supabase ต้องตั้งค่าตามหัวข้อ “ตั้งค่า Supabase” ก่อน ถ้ายังไม่ตั้ง ยังเปิดดู ค้นหา กรอง และดูรายละเอียดหนังได้ ส่วนหน้าบัญชี ห้องสมุด และโปรไฟล์จะแสดงวิธีตั้งค่าแทน รูปภาพและฟอนต์ต้องใช้อินเทอร์เน็ต

## ตั้งค่า Supabase

1. สมัคร/เข้าสู่ระบบที่ [Supabase](https://supabase.com) → **New project** (region: Southeast Asia (Singapore))
2. **Authentication → Sign In / Providers**: ส่วน User Signups ปิด **Confirm email** และในรายการ Auth Providers ต้องเปิด **Email** ไว้ → Save
3. **SQL Editor → New query** วางเนื้อหาไฟล์ `supabase/schema.sql` ทั้งไฟล์ → **Run** (รันซ้ำได้)
4. **Project Settings → API** คัดลอก Project URL และ anon/publishable key ใส่ใน `.env`:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```

   anon/publishable key อยู่ในเบราว์เซอร์ได้ สิทธิ์ข้อมูลบังคับด้วย Row Level Security ส่วน `SUPABASE_SERVICE_ROLE_KEY` ใส่เฉพาะเมื่อจะรันเทสต์ RLS/browser ห้ามขึ้นต้นด้วย `NEXT_PUBLIC_` และห้าม commit

## เชื่อมข้อมูลหนังจริงจาก TMDB

1. สมัคร/เข้าสู่ระบบที่ [TMDB](https://www.themoviedb.org/)
2. ไปที่ [Settings → API](https://www.themoviedb.org/settings/api) สมัครใช้งาน API และคัดลอก **API Read Access Token** (ข้อความยาว ไม่ใช่ API Key แบบสั้น)
3. คัดลอกไฟล์ตัวอย่าง:

   ```bash
   cp .env.example .env
   ```

4. เปิด `.env` ใน editor ใส่ `TMDB_READ_TOKEN=โทเคนของคุณ` หรือใช้ API Key (v3) แบบสั้นด้วย `TMDB_API_KEY=คีย์ของคุณ` แล้วหยุด/เริ่ม `npm run dev` ใหม่

Token อยู่ฝั่งเซิร์ฟเวอร์เท่านั้น ไม่ใช้ `NEXT_PUBLIC_` และไม่ส่งไปยังเบราว์เซอร์ `.env` ถูกละเว้นใน `.gitignore` ไม่ต้องส่ง token ในแชต

เมื่อมี token แอปจะเรียก TMDB จริง ป้ายโหมดตัวอย่างจะหายไป ถ้า token ผิดหรือ API ล่มจะแสดงข้อผิดพลาดพร้อมให้ลองใหม่ ไม่สลับกลับไปใช้ข้อมูลตัวอย่างโดยไม่แจ้ง

### API ที่ใช้

| งาน                             | TMDB endpoint                                    |
| ------------------------------- | ------------------------------------------------ |
| สำรวจ / กรองประเภท / เรียงคะแนน | `/3/discover/movie`                              |
| ค้นหาชื่อภาษาไทยหรืออังกฤษ      | `/3/search/movie`                                |
| ประเภทหนัง                      | `/3/genre/movie/list`                            |
| รายละเอียด นักแสดง และวิดีโอ    | `/3/movie/:id?append_to_response=credits,videos` |

ค้นหาตามชื่อหลังหยุดพิมพ์ 400 มิลลิวินาที (debounce) หรือกดส่งฟอร์ม ยกเลิกคำขอเก่าเมื่อคำค้นเปลี่ยน ประเภท ปีที่ฉาย ภาษาต้นฉบับ และการเรียงใช้เมื่อสำรวจโดยไม่มีคำค้น เพราะ TMDB search ไม่รองรับตัวกรองแบบ discover รายการแบ่งหน้าครั้งละตามที่ TMDB ส่งมา และจำกัดหน้าไม่เกิน 500 กรองหลายเงื่อนไขร่วมกันได้ เรียงตามความนิยม คะแนน ใหม่ไปเก่า หรือเก่าไปใหม่; หมวดมาแรง/กำลังฉาย/เร็ว ๆ นี้ใช้เมื่อไม่ได้เลือกตัวกรอง และมีปุ่มล้างคำค้นและตัวกรอง

ขอข้อมูลภาษาไทย ถ้าไม่มีเรื่องย่อภาษาไทยจะแสดงข้อความบอก วิดีโอตัวอย่างแสดงเมื่อมี YouTube trailer ในผลลัพธ์นั้น มีหน้าเครดิตพร้อมโลโก้ TMDB ที่ `/about`

เอกสารอ้างอิง: [Getting started](https://developer.themoviedb.org/docs/getting-started), [Authentication](https://developer.themoviedb.org/docs/authentication-application), [Search](https://developer.themoviedb.org/docs/search-and-query-for-details), [Attribution](https://developer.themoviedb.org/docs/faq)

## วิธีแชร์ให้เพื่อน

1. สมัครสมาชิกหรือเข้าสู่ระบบ กด ♥ ที่หนังเรื่องที่ชอบ (🔖 คือเก็บไว้ดูทีหลัง)
2. เปิด **ตั้งค่าโปรไฟล์ → เปิดเป็นสาธารณะ → คัดลอกลิงก์** (`/u/ชื่อผู้ใช้`)
3. เพื่อนเห็นชื่อที่แสดงและหนังที่คุณกดถูกใจ ไม่เห็นรายการอยากดู ไม่เห็นอีเมล ไม่ต้องล็อกอิน และแก้อะไรไม่ได้
4. เปลี่ยนเป็นส่วนตัวแล้วลิงก์ใช้ไม่ได้ทันที คนอื่นจะเห็นว่า “ไม่พบโปรไฟล์ หรือโปรไฟล์นี้เป็นส่วนตัว” · เปลี่ยนชื่อผู้ใช้แล้วลิงก์เก่าจะใช้ไม่ได้

**ลิงก์ localhost เปิดได้เฉพาะเครื่องตัวเอง** ถ้าอยู่ Wi-Fi เดียวกัน ให้เจ้าของเปิดเว็บผ่าน IP ของเครื่องเจ้าของ เช่น `http://192.168.x.x:5175` ก่อนคัดลอกลิงก์ เครื่องเจ้าของต้องเปิดเซิร์ฟเวอร์และอนุญาตการเชื่อมต่อผ่าน firewall เครือข่ายบางแห่งอาจปิดการติดต่อระหว่างเครื่อง

เว็บไซต์ที่ deploy แล้ว: https://movie-library-por24.vercel.app (ข้อมูลอยู่ใน Supabase ไม่ต้องมี disk ถาวร)

```bash
npm run build
npm start
```

Production ใช้ `next start` ส่งทั้งหน้าเว็บและ `/api` จาก origin เดียวกัน ตั้ง `TMDB_READ_TOKEN` หรือ `TMDB_API_KEY` ฝั่งเซิร์ฟเวอร์ ส่วน `NEXT_PUBLIC_SUPABASE_URL` และ `NEXT_PUBLIC_SUPABASE_ANON_KEY` ต้องมีตอน `npm run build` และเพิ่มโดเมนจริงใน Supabase → Authentication → URL Configuration

## โครงสร้างและพื้นฐานที่ใช้

```text
src/
  components/  Layout, MovieCard, LibraryButtons (♥/🔖), SetupNotice, สถานะ loading/error/empty
  context/     AuthContext และ LibraryContext
  hooks/       useFetch — โหลดข้อมูล + cleanup + retry
  app/         Next.js App Router pages, shared layout และ API Route Handlers
  screens/     Home, Movies, MovieDetail, Library, Profile, ProfileSettings, Auth, Static
  schemas/     auth.js — zod schema ของฟอร์มและ username
  lib/         api.js (fetch + helper รูป/ปี), supabase.js (client),
               library.js (toggle/rollback แบบ pure), profiles.js, supabaseErrors.js
  index.css    ธีม Responsive
server/
  api.js       Web Request/Response handler สำหรับ Next.js Route Handlers
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
| Next.js App Router              | file-based pages/layout, next/link, next/navigation และ not-found |
| Context + custom hook           | useAuth / useLibrary ส่งข้อมูลร่วมหลายหน้า                        |
| react-hook-form + zod           | สมัครสมาชิก / ล็อกอิน / ตั้งค่าโปรไฟล์ ตรวจฟอร์มก่อนส่ง Supabase  |
| เก็บข้อมูลหลัง refresh          | Supabase (Postgres + RLS) รองรับหลายบัญชีและการแชร์ข้ามเครื่อง    |

### State อยู่ที่ไหน ทำไม

- คำค้น ประเภท การเรียง และหน้าอยู่ใน URL ผ่าน `useSearchParams` เปิดลิงก์เดิมแล้วได้การค้นหาเดิม ใช้ `replace` ตอนเปลี่ยนตัวกรอง ไม่สร้าง history ทุกตัวอักษร ช่องชื่อหนังเป็น controlled input เก็บ draft ระหว่างพิมพ์ แล้วอัปเดต URL หลัง debounce หรือ submit; การย้อนกลับ/ไปข้างหน้าจะอัปเดต draft ให้ตรงกับ URL
- **AuthContext** เก็บ session และ profile (username, ชื่อที่แสดง, สาธารณะ/ส่วนตัว) ฟัง `onAuthStateChange` ของ Supabase เพื่ออัปเดตเมื่อล็อกอิน/ล็อกเอาต์หรือ session หมดอายุ
- **LibraryContext** เก็บแถว `library_items` ของตัวเองชุดเดียว `likedIds` และ `watchlistIds` คำนวณจากชุดนี้ ไม่เก็บ state ซ้ำ กดปุ่มแล้วเปลี่ยนทันที (optimistic) ถ้าบันทึกพลาดจะย้อนเฉพาะรายการนั้นด้วย `revertToggle` เปลี่ยนบัญชีแล้วรีเซ็ต LibraryProvider ด้วย key เพื่อไม่ให้เห็นข้อมูลบัญชีเดิม
- หน้าโปรไฟล์ `/u/:username` โหลดข้อมูลของคนอื่นแยกในหน้านั้นเอง ไม่ใช้ LibraryContext
- ไม่ใช้ Redux/Zustand เพราะ state ที่ใช้ร่วมกันทั้งแอปมีแค่ user/profile และรายการหนังของตัวเอง

### ส่วนที่เพิ่มจากพื้นฐานงานเดิม

งานเดิมเป็น frontend และไม่ได้ต้องมีบัญชีจริง งานนี้ใช้ Supabase Auth จัดการรหัสผ่านและ session ส่วนสิทธิ์ข้อมูลบังคับด้วย Row Level Security ในฐานข้อมูล (ดู `supabase/schema.sql`) Next.js Route Handlers เก็บ TMDB key ฝั่งเซิร์ฟเวอร์และ proxy ข้อมูลหนัง

ยังไม่มี email verification, ลืมรหัสผ่าน, เปลี่ยนรหัสผ่าน หรือระบบจัดการบัญชี นี่เป็นโปรเจกต์เรียนรู้และต้นแบบ ยังไม่ได้ผ่านการตรวจเพื่อเปิดบริการสาธารณะขนาดใหญ่

**เป็นงานต่อยอดธีมหนัง ไม่ใช่คำตอบแทนโจทย์ Pokémon ทุกข้อ** เช่น ไม่มีทีม 6 ตัว/เงื่อนไขลงทะเบียนทีม 3 ตัว เพราะเปลี่ยนเป็นห้องสมุดกับบัญชีตามขอบเขตใหม่นี้

## ตรวจสอบ

```bash
npm test
npm run build
```

Unit test ตรวจ logic กดถูกใจ/ย้อนกลับ, การแปล error ของ Supabase, schema ฟอร์ม/username และการอ่าน env ส่วน server test ตรวจ search/filter/detail/error และยืนยันว่า route บัญชีแบบเก่าไม่มีแล้ว

`tests/rls.test.js` รันกับ Supabase จริงเมื่อ `.env` มี `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` และ `SUPABASE_SERVICE_ROLE_KEY` ครบ จะสร้าง user ทดสอบ 2 คนแล้วลบทิ้งเอง ตรวจว่าโปรไฟล์ส่วนตัวไม่มีใครเห็น, สาธารณะเห็นเฉพาะถูกใจ, แก้ข้อมูลคนอื่นไม่ได้ ถ้า env ไม่ครบจะแสดง SKIP พร้อมเหตุผล (**SKIP ไม่ได้แปลว่าผ่าน**)

ทดสอบ adapter TMDB ด้วย mock HTTP เพื่อยืนยัน request และ error handling **ยังไม่ได้ทดสอบ live TMDB เพราะยังไม่มี token**

ทดสอบเบราว์เซอร์เพิ่มเติมได้หลัง build:

```bash
npm install --no-save --package-lock=false playwright
npx playwright install chromium
node tests/browser.mjs
```

ต้องมี Supabase จริงเหมือนเทสต์ RLS (รันด้วย `node --env-file=.env tests/browser.mjs`) สร้างภาพ desktop/mobile ใน `test-results/` ตรวจสมัคร กดถูกใจ/อยากดู โปรไฟล์ส่วนตัว/สาธารณะเมื่อเปิดเป็น guest และหน้าจอมือถือไม่ล้นแนวนอน

เวลาส่งงานไม่รวม `node_modules`, `.env`, `test-results` เพราะมีขนาดใหญ่หรือเป็นข้อมูลส่วนตัว

## ใช้งานหน้าจอใหม่

- หน้าแรกแบ่งแถวมาแรง คะแนนสูง กำลังฉาย และเร็ว ๆ นี้ เลื่อนแนวนอนหรือกดดูทั้งหมดได้
- ทางลัดหนังที่ถูกใจ/อยากดูเปิดแท็บห้องสมุดตรงตามที่เลือก และเรียงตามเพิ่มล่าสุดหรือชื่อหนังได้
- ปุ่มเล่นบนโปสเตอร์เลือกหนังเข้าแถบตัวอย่างด้านล่าง กดเล่นเพื่อเปิด trailer ใน dialog; Escape หรือปิดวิดีโอจะหยุด iframe
- ตัวอย่างอ้างอิง TMDB/YouTube หากไม่มีวิดีโอจะแจ้งให้ทราบ ไม่ใช่บริการสตรีมหนังเต็มเรื่อง

### Movie workspace UI

Spotify-inspired three-panel desktop layout: searchable library on the left, discovery and new releases in the center, selected movie details and recommendations on the right. The top search submits to movie discovery; the bottom dock opens available movie trailers. Mobile uses bottom navigation and a compact trailer dock. Icons use the pinned Flaticon Uicons regular-rounded package, with visible attribution in the footer and About page: [Uicons by Flaticon](https://www.flaticon.com/uicons).

## Next.js architecture

- `src/app/`: file-based pages, shared root layout/providers, and `api/[...path]/route.js`.
- `src/screens/`: reusable client screen components, rendered by the App Router routes.
- `src/lib/navigation.jsx`: small helpers using `next/link` and `next/navigation`; no React Router dependency.
- `server/api.js` and `server/movies.js`: Web Request/Response handler and movie service run inside Next.js Route Handlers; TMDB credentials stay server-side.
- Supabase Auth remains client-side; library writes go through `POST /api/library`, which verifies the access token and preserves RLS. Public environment names migrated from `VITE_` to `NEXT_PUBLIC_`.
- `npm test`: domain, adapter and Route Handler tests. `npm run typecheck` and `npm run build`: Next.js checks.

API request limits are per client when `API_TRUST_PROXY=1`; enable this only with a trusted ingress that overwrites `X-Forwarded-For`. Local development does not trust forwarded headers or use a shared user quota. For production without that ingress, configure per-client limits at the gateway. These in-process limits reset on restart and are not shared across server instances.

## รายการตรวจสอบข้อกำหนดโปรเจกต์ปลายภาค

| ข้อกำหนด | การนำไปใช้และเหตุผล |
| --- | --- |
| ใช้ Next.js App Router อย่างน้อย 4 routes | มี `/`, `/movies`, `/movies/[id]`, `/library`, `/register`, `/login`, `/settings/profile`, `/u/[username]` และ `/about` |
| มีทั้ง Server Components และ Client Components พร้อมอธิบายเหตุผล | `src/app/page.jsx` และ root layout เป็น Server Components ส่วน `src/screens/Home.jsx` และ providers เป็น Client Components เพราะใช้ Context, state และตัวจัดการเหตุการณ์ ฝั่ง server ส่งข้อมูลหนังสาธารณะผ่าน props ที่แปลงเป็นข้อมูลส่งต่อได้ และเก็บข้อมูลลับไว้บน server |
| ดึงข้อมูลด้วย SSR ที่กำหนดอย่างชัดเจน | หน้าแรกกำหนด `dynamic = 'force-dynamic'` และ `revalidate = 0` โดย server รอข้อมูลหนังที่กำลังฉายจาก TMDB ก่อน render จึงมีชื่อหนังและโปสเตอร์ใน HTML เริ่มต้น Cache ของ TMDB ที่มี TTL ภายในแต่ละ instance ช่วยลดคำขอไปยัง API ส่วนหน้าเว็บยังเป็น SSR หาก TMDB ใช้งานไม่ได้ คอลเลกชันฝั่ง client จะแสดงข้อผิดพลาดและปุ่มลองใหม่ |
| มี mutation ผ่าน Route Handler | `POST /api/library` ตรวจ JSON ด้วย Zod ตรวจ token ด้วย Supabase `getUser` กำหนด `user_id` จากผู้ใช้ที่ตรวจสอบแล้ว และเพิ่ม/ลบรายการถูกใจหรืออยากดูภายใต้ RLS ของผู้ใช้ ฝั่ง client อัปเดตหน้าจอทันทีแบบ optimistic update และย้อนค่าหากบันทึกไม่สำเร็จ โดยไม่ใช้ service-role key หรือเชื่อ user ID ที่ client ส่งมา |
| มี global state ฝั่ง client | AuthContext, LibraryContext และ PreviewContext จัดการ session รายการหนังที่บันทึก และการเลือกตัวอย่างหนัง |
| ฟอร์มตรวจสอบข้อมูลจริง | ฟอร์มสมัครสมาชิก เข้าสู่ระบบ และแก้โปรไฟล์ใช้ react-hook-form + zodResolver ส่วน server ตรวจข้อมูลการบันทึกห้องสมุดซ้ำอีกชั้น |
| รองรับหลายขนาดหน้าจอและมี URL บน Vercel | เดสก์ท็อปใช้หน้าจอสามคอลัมน์ มือถือใช้เมนูด้านล่าง เว็บไซต์: https://movie-library-por24.vercel.app |

การตรวจสอบ: `npm test`, `npm run typecheck` และ `npm run build` โดย tests ของ Route Handler ครอบคลุม token ที่ไม่มีหรือหมดอายุ ข้อมูลไม่ถูกต้อง การปลอมเจ้าของรายการ การบันทึก/ลบสำเร็จ และข้อความข้อผิดพลาดที่ไม่เปิดเผยข้อมูลภายใน สำหรับ production ต้องตั้งค่า TMDB credentials, `NEXT_PUBLIC_SUPABASE_URL` และ `NEXT_PUBLIC_SUPABASE_ANON_KEY` ใน Vercel
