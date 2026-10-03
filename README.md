# CineShelf — ห้องสมุดหนังเรื่องโปรด

โปรเจกต์ใหม่ที่อิงพื้นฐาน React จาก `assignment-01-start-2` ใช้ธีมโรงหนังโทนมืด ค้นหาหนัง เก็บเรื่องโปรดแยกตามบัญชี และแชร์ห้องสมุดให้เพื่อนเปิดดูโดยไม่ต้องล็อกอิน

## เริ่มรัน

ใช้ **Node.js 22.13 ขึ้นไป** (ทดสอบกับ Node.js 24.19.0)

```bash
cd /Users/pordiewtrakul/Downloads/movie-library
npm install
npm run dev
```

เปิด **http://localhost:5175** คำสั่งเดียวเปิดทั้ง React และ API server ที่พอร์ต 3001 ใช้พอร์ต 5175 แยกจากงานเดิม

ตอนนี้ไม่ต้องตั้งค่าอะไรก็ทดลองได้ มีชุดตัวอย่างหนัง 12 เรื่องและป้าย “โหมดตัวอย่าง” สมัครบัญชีใหม่เพื่อทดลองบันทึกหนังได้จริง ไม่ได้สร้างบัญชีหรือรหัสผ่านเริ่มต้นไว้ให้

ข้อมูลบัญชีและห้องสมุดอยู่ใน `data/cineshelf.sqlite` จึงยังอยู่หลังรีเฟรชหรือรีสตาร์ตเซิร์ฟเวอร์ รูปภาพและฟอนต์ต้องใช้อินเทอร์เน็ต

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

1. สมัครสมาชิกหรือเข้าสู่ระบบ เพิ่มหนังด้วยปุ่ม `+`
2. เปิด **ห้องสมุดของฉัน → เปิดแชร์ห้องสมุด → คัดลอกลิงก์**
3. เพื่อนเห็นชื่อที่แสดงและรายการหนังล่าสุด ไม่เห็นอีเมล ไม่ต้องล็อกอิน และแก้ห้องสมุดไม่ได้
4. ปิดแชร์เพื่อยกเลิกลิงก์เดิม เปิดแชร์ใหม่จะได้ลิงก์ใหม่

**ลิงก์ localhost เปิดได้เฉพาะเครื่องตัวเอง** ถ้าอยู่ Wi-Fi เดียวกัน ให้เจ้าของเปิดเว็บผ่าน Network URL ที่ Vite แสดง เช่น `http://192.168.x.x:5175` ก่อนคัดลอกลิงก์ เครื่องเจ้าของต้องเปิดเซิร์ฟเวอร์และอนุญาตการเชื่อมต่อผ่าน firewall เครือข่ายบางแห่งอาจปิดการติดต่อระหว่างเครื่อง

สำหรับเพื่อนนอกเครือข่าย ต้องนำ React และ Node server ไป deploy บนเซิร์ฟเวอร์ที่รองรับ **persistent disk** สำหรับ SQLite ก่อน โปรเจกต์นี้ยังไม่ได้ deploy

```bash
npm run build
npm start
```

Production server ส่งทั้งไฟล์ React ใน `dist` และ `/api` จาก origin เดียวกัน ตั้ง `APP_ORIGIN=https://โดเมนจริง`, `COOKIE_SECURE=true`, `DATABASE_PATH=/ตำแหน่ง-disk-ถาวร/cineshelf.sqlite` และ `TMDB_READ_TOKEN` ใน environment ของโฮสต์ ใช้หนึ่ง instance กับ SQLite ห้ามเก็บฐานข้อมูลบน temporary filesystem ของ serverless deployment

## โครงสร้างและพื้นฐานที่ใช้

```text
src/
  components/  Layout, MovieCard, SaveButton, สถานะ loading/error/empty
  context/     AuthContext และ LibraryContext
  hooks/       useFetch — โหลดข้อมูล + cleanup + retry
  pages/       Home, Movies, MovieDetail, Library, Shared, Auth, Static
  schemas/     auth.js — zod schema ใช้ร่วมทั้ง client/server
  lib/         api.js — fetch wrapper และ helper รูป/ปี
  index.css    ธีม Responsive + Tailwind import
server/
  index.js     Node HTTP server, SQLite, บัญชี, session, ห้องสมุด, แชร์
  movies.js    เชื่อม TMDB จากเซิร์ฟเวอร์
  demo.js      ชุดตัวอย่าง 12 เรื่อง
tests/         API integration, TMDB adapter และ browser checks
```

| แนวคิดจากงานเดิม                | ใน CineShelf                                                      |
| ------------------------------- | ----------------------------------------------------------------- |
| Components / props / list + key | MovieCard ใช้ซ้ำในหน้าสำรวจ ห้องสมุด และหน้าแชร์                  |
| useState + controlled inputs    | ช่องค้นหาหน้าแรกและค้นหาในห้องสมุด                                |
| useEffect + custom hook         | useFetch จัดการ loading / error / cleanup / retry                 |
| React Router                    | Layout + Outlet, Link/NavLink, useParams, useSearchParams, 404    |
| Context + custom hook           | useAuth / useLibrary ส่งข้อมูลร่วมหลายหน้า                        |
| react-hook-form + zod           | สมัครสมาชิก / ล็อกอิน ตรวจฟอร์มทั้ง client และ server             |
| เก็บข้อมูลหลัง refresh          | SQLite แทน localStorage เพื่อรองรับหลายบัญชีและการแชร์ข้ามเครื่อง |

### State อยู่ที่ไหน ทำไม

- คำค้น ประเภท การเรียง และหน้าอยู่ใน URL ผ่าน `useSearchParams` เปิดลิงก์เดิมแล้วได้การค้นหาเดิม ใช้ `replace` ตอนเปลี่ยนตัวกรอง ไม่สร้าง history ทุกตัวอักษร ช่องชื่อหนังในหน้าสำรวจเป็น draft ของฟอร์มแบบ uncontrolled แล้วค่อย commit เข้า URL ตอน submit จึงไม่มี useState คำค้นซ้ำกับ URL
- ชื่อบัญชีและสถานะ session อยู่ใน AuthContext รายการหนังอยู่ใน LibraryContext เพราะ Navbar, MovieCard, รายละเอียด และห้องสมุดใช้ร่วมกัน จำนวนหนังและ has(id) คำนวณจาก array ไม่เก็บ state ซ้ำ เปลี่ยนบัญชีแล้วรีเซ็ต LibraryProvider ด้วย key เพื่อไม่ให้เห็นข้อมูลบัญชีเดิม
- ความจริงของข้อมูลอยู่ในฐานข้อมูล ไม่เก็บรหัสผ่าน/session ใน localStorage useFetch อ่านข้อมูลจาก server ปุ่มเพิ่ม/ลบรับรายการล่าสุดกลับมาแล้วอัปเดต Context
- ฟอร์มใช้ react-hook-form และ schema ที่แยกไฟล์ หน้าแชร์โหลดข้อมูลอ่านอย่างเดียวแยกจากห้องสมุดของผู้ใช้ที่ล็อกอิน
- ไม่ใช้ Redux/Zustand หรือ memoization เพราะ state ยังเล็กและไม่มีผลการวัดว่าจำเป็น

### ส่วนที่เพิ่มจากพื้นฐานงานเดิม

งานเดิมเป็น frontend และไม่ได้ต้องมีบัญชีจริง งานนี้เพิ่ม backend เพื่อให้สมัคร/ล็อกอินและแชร์ข้ามเครื่องได้ เก็บรหัสผ่านด้วย scrypt + random salt ใช้ session cookie แบบ HttpOnly/SameSite และเก็บเฉพาะ hash ของ session token ในฐานข้อมูล ตรวจ origin ของคำขอแก้ไข จำกัดจำนวนคำขอ และตรวจสิทธิ์เจ้าของทุกครั้ง

ยังไม่มี email verification, ลืมรหัสผ่าน, เปลี่ยนรหัสผ่าน หรือระบบจัดการบัญชี นี่เป็นโปรเจกต์เรียนรู้และต้นแบบ ยังไม่ได้ผ่านการตรวจเพื่อเปิดบริการสาธารณะขนาดใหญ่

**เป็นงานต่อยอดธีมหนัง ไม่ใช่คำตอบแทนโจทย์ Pokémon ทุกข้อ** เช่น ไม่มีทีม 6 ตัว/เงื่อนไขลงทะเบียนทีม 3 ตัว เพราะเปลี่ยนเป็นห้องสมุดกับบัญชีตามขอบเขตใหม่นี้

## ตรวจสอบ

```bash
npm test
npm run build
```

ทดสอบ API โดยใช้ SQLite ในหน่วยความจำแยกจากข้อมูลจริง ตรวจสมัครสมาชิก/ล็อกอิน, duplicate email, session/logout, account isolation, เก็บหนังซ้ำ, public read-only share, ปิด/เปิดแชร์และเพิกถอนลิงก์, origin checking, search/filter/detail/error

ทดสอบ adapter TMDB ด้วย mock HTTP เพื่อยืนยัน request และ error handling **ยังไม่ได้ทดสอบ live TMDB เพราะยังไม่มี token**

ทดสอบเบราว์เซอร์เพิ่มเติมได้หลัง build:

```bash
npm install --no-save --package-lock=false playwright
npx playwright install chromium
node tests/browser.mjs
```

ใช้ฐานข้อมูลชั่วคราวในหน่วยความจำ สร้างภาพ desktop/mobile ใน `test-results/` ตรวจฟอร์ม ค้นหา เพิ่ม/ลบ รีเฟรช แชร์เป็น guest ปิดแชร์ ล็อกอินผิด/ถูก และหน้าจอมือถือไม่ล้นแนวนอน

เวลาส่งงานไม่รวม `node_modules`, `.env`, `data`, `test-results` เพราะมีขนาดใหญ่หรือเป็นข้อมูลส่วนตัว
