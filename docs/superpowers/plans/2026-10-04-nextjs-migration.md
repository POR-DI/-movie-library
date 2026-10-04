# CineShelf → Next.js App Router Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ย้าย CineShelf จาก Vite + React Router (SPA) ไป Next.js 16 App Router โดยให้ **2 หน้าเป็น Server Component ที่ดึงข้อมูลจริง**: `/movies/[id]` และ `/` ส่วนหน้าอื่นทำงานเหมือนเดิมแบบ Client Component

**Architecture:** `src/app/` เป็น router ของ Next · หน้า `/movies/[id]` และ `/` เรียก `movieService` (ไฟล์ `server/movies.js` เดิม) ตรงจาก Server Component ไม่ผ่าน HTTP · `/api/*` ยังอยู่ (client ของหน้า `/movies` และแท็บหมวดหมู่ยังเรียกใช้) แต่ย้ายเป็น Route Handler ตัวเดียว `src/app/api/[...path]/route.js` ที่เรียก `createApiHandler` (Web `Request` → `Response`) · Supabase ยังอยู่ฝั่ง client ทั้งหมด (session ใน localStorage, RLS เหมือนเดิม) · ส่วนที่ต้องโต้ตอบ (ปุ่มถูกใจ, ช่องค้นหา, แท็บ) เป็น client island ใน Server Component

**Tech Stack:** Next.js 16.3 (App Router, Turbopack), React 19.2, Tailwind 4 ผ่าน `@tailwindcss/postcss`, `@supabase/supabase-js` v2, react-hook-form + zod 4, Node 24 (`node --test`), Playwright (browser test, optional)

**Spec:** ไม่มี spec แยก — การตัดสินใจทั้งหมดอยู่ในหัวข้อ "Decisions" ด้านล่าง (มาจากการคุยในแชต 2026-10-04: ต้องมี Server Component ≥ 2 หน้า, เลือก `/movies/[id]` และ `/`)

## Decisions

1. **Server Component แค่ 2 หน้า**: `/movies/[id]` และ `/` ไม่ทำ `/u/[username]` เป็น server เพราะเจ้าของต้องเห็นโปรไฟล์ส่วนตัว ซึ่งต้องใช้ session แบบ cookie (`@supabase/ssr`) — นอกขอบเขต
2. **ไม่ย้าย Supabase auth ไป cookie** session อยู่ใน localStorage เหมือนเดิม
3. **เก็บ `/api/*`** เพราะ `/movies` (ค้นหา/กรอง/แบ่งหน้า) และแท็บหมวดในหน้าแรกยังเป็น client
4. **ยังเป็น JavaScript (`.jsx`)** ไม่แปลงเป็น TypeScript ยกเว้นไฟล์ `.ts` เดิม
5. **app router อยู่ที่ `src/app/`** และ **ย้าย `src/pages/` → `src/views/`** เพราะ Next จะถือว่า `src/pages/` เป็น Pages Router แล้วสร้าง route ซ้ำ/พัง
6. **env ฝั่ง browser เปลี่ยนชื่อ** `VITE_SUPABASE_URL` → `NEXT_PUBLIC_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` → `NEXT_PUBLIC_SUPABASE_ANON_KEY` (ทั้ง `.env` ในเครื่องและใน Vercel)
7. **ไม่ใช้ `next/image`** ใช้ `<img>` เดิม (YAGNI, ไม่ต้องตั้ง remotePatterns)
8. **ตัด rate limit ต่อ IP ฝั่ง Node เดิมไม่ได้** — ย้ายเข้า `createApiHandler` ใช้ IP จาก `x-forwarded-for`
9. **หน้า `/` ใช้ ISR** `revalidate = 3600` (ข้อมูล trending เปลี่ยนวันละครั้งพอ) · `/movies/[id]` render ตอน request (dynamic)

## Global Constraints

- Node `>=22.13.0` (เครื่องนี้ v24.19.0)
- `next@^16.3.8` · dependency ใหม่ที่อนุญาต: `next`, `@tailwindcss/postcss`, `server-only` · ต้องลบ: `react-router-dom`, `vite`, `@vitejs/plugin-react`, `@tailwindcss/vite`
- dev server พอร์ต **5175** เหมือนเดิม (`next dev -p 5175`)
- env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (browser) · `TMDB_READ_TOKEN` / `TMDB_API_KEY` (server เท่านั้น ห้ามมี `NEXT_PUBLIC_`) · `SUPABASE_SERVICE_ROLE_KEY` ใช้เฉพาะ `tests/` · `CINESHELF_SAMPLE_CATALOG=1` บังคับใช้ sample catalog (ใช้ใน browser test)
- ไฟล์ที่ import `server/service.js` ต้องเป็น Server Component หรือ Route Handler เท่านั้น (`import 'server-only'` กันไว้)
- ข้อความ UI ภาษาไทยเหมือนเดิมทุกตัวอักษร · ไม่ใช้ `letter-spacing` กับข้อความไทย
- โค้ดสไตล์เดิม: ไม่มี semicolon, single quote, 2 spaces (`.prettierrc.json`)
- git: email `pordiewtrakul@gmail.com` · **ห้าม commit โดยไม่ถามผู้ใช้ก่อน** · ห้ามใส่ `Co-Authored-By` · message รูปแบบ `type(scope): desc`

## Review Focus

1. **เปิด `/movies/abc`, `/movies/0`, `/movies/999999999`** — ต้องได้หน้า "ไม่พบหนังเรื่องนี้" พร้อมลิงก์กลับ และ HTTP status 404 (ไม่ใช่ 500) → Task 4 Step 6 (curl status) + `src/app/movies/[id]/not-found.jsx`
2. **TMDB ล่ม/token ผิด ตอนเปิดหน้ารายละเอียดใน production** — Next ซ่อน `error.message` ของ Server Component ใน production ผู้ใช้ต้องเห็นข้อความไทย "โหลดข้อมูลจาก TMDB ไม่ได้ กรุณาลองอีกครั้ง" + ปุ่มลองอีกครั้ง ไม่ใช่ข้อความอังกฤษของ Next → `error.jsx` ใช้ข้อความคงที่ + Task 4 Step 7
3. **เปิด `/movies?q=inter` หรือ `/login?next=/library` ตรงๆ (hard load)** — `useSearchParams` ต้องอยู่ใน `<Suspense>` ไม่งั้น `next build` ล้ม → Task 3 Step 12 (`npm run build` ต้องผ่าน)
4. **ลืมตั้ง env Supabase หรือยังใช้ชื่อ `VITE_` เดิม** — ต้องเห็น SetupNotice ที่บอกชื่อ `NEXT_PUBLIC_` ใหม่ ไม่ใช่จอขาว → `tests/supabase-config.test.js` (Task 3 Step 1–2)
5. **ผู้ใช้ล็อกอินกดถูกใจบนหน้ารายละเอียดที่ render จาก server** — ปุ่มต้อง hydrate แล้วบันทึกได้ และ guest ต้องถูกพาไป `/login?next=/movies/<id>` → `tests/browser.mjs` (Task 6) มีขั้นตอนนี้อยู่แล้ว

---

## File Map

| ไฟล์ | สถานะ | รับผิดชอบ |
| --- | --- | --- |
| `server/api.js` | ใหม่ | `createApiHandler({ movieService })` → `(Request) => Promise<Response>` routes `/api/config`, `/api/genres`, `/api/movies`, `/api/movies/:id` + rate limit |
| `server/service.js` | ใหม่ | singleton `movieService` (อ่าน env, `server-only`) |
| `tests/api.test.js` | ใหม่ (แทน `tests/server.test.js`) | ทดสอบ `createApiHandler` ด้วย `Request` |
| `next.config.mjs` | ใหม่ | security headers |
| `postcss.config.mjs` | ใหม่ | Tailwind 4 |
| `src/app/layout.jsx` | ใหม่ | `<html lang="th">`, metadata, import `index.css` |
| `src/app/providers.jsx` | ใหม่ (client) | SetupNotice / AuthProvider / LibraryProvider (keyed) / SiteShell |
| `src/app/api/[...path]/route.js` | ใหม่ | `export const GET = createApiHandler(...)` |
| `src/app/**/page.jsx` | ใหม่ | 1 ไฟล์ต่อ route |
| `src/app/not-found.jsx` | ใหม่ | 404 ทั้งเว็บ |
| `src/app/movies/[id]/{page,not-found,error}.jsx` | ใหม่ | Server Component #1 |
| `src/components/SiteShell.jsx` | ย้ายจาก `Layout.jsx` (client) | header/nav/footer, `children` แทน `Outlet` |
| `src/components/Redirect.jsx` | ใหม่ (client) | แทน `<Navigate>` |
| `src/components/FallbackImage.jsx` | ใหม่ (client) | `<img>` ที่สลับเป็น fallback เมื่อโหลดไม่ได้ |
| `src/components/RefreshButton.jsx` | ใหม่ (client) | `router.refresh()` |
| `src/components/HeroSearch.jsx` | ใหม่ (client) | ฟอร์มค้นหาหน้าแรก |
| `src/components/DiscoveryRoom.jsx` | ใหม่ (client) | แท็บหมวด + `MovieCollection` |
| `src/views/*.jsx` | ย้ายจาก `src/pages/*.jsx` | เนื้อหาแต่ละหน้า |
| `src/views/MovieDetail.jsx` | แก้เป็น Server Component | รับ `movie` เป็น prop |
| `src/views/Home.jsx` | แก้เป็น Server Component | รับ `featured`, `trending` เป็น prop |
| `src/lib/supabaseConfig.js`, `src/lib/supabase.js` | แก้ | env `NEXT_PUBLIC_` |
| ลบ | — | `index.html`, `vite.config.js`, `scripts/dev.js`, `server/index.js`, `api/index.js`, `src/main.jsx`, `src/App.jsx`, `src/vite-env.d.ts`, `tests/server.test.js` |

---

### Task 1: ตรวจ baseline ก่อนเริ่ม

**Files:** ไม่มี

- [ ] **Step 1: เช็คว่า working tree สะอาดและเทสต์เดิมผ่าน**

Run: `git status --short && npm test`
Expected: ไม่มีไฟล์ค้าง · เทสต์ผ่านทั้งหมด (rls อาจ SKIP ถ้าไม่มี env — จดไว้)

- [ ] **Step 2: สร้าง branch**

```bash
git switch -c feat/nextjs-app-router
```

---

### Task 2: API เป็น Web handler (`server/api.js`)

แยก logic ของ `/api/*` ออกจาก `node:http` ให้รับ `Request` คืน `Response` เพื่อใช้ได้ทั้งใน Next Route Handler และในเทสต์ ทำก่อนลบ `server/index.js` (Task 3)

**Files:**
- Create: `server/api.js`
- Create: `server/service.js`
- Test: `tests/api.test.js`

**Interfaces:**
- Consumes: `createMovieService(token, apiKey)`, `HttpError` จาก `server/movies.js` (ไม่แก้)
- Produces: `createApiHandler({ movieService, limit = 240 }) => (request: Request) => Promise<Response>` · `movieService` (export จาก `server/service.js`)

- [ ] **Step 1: เขียนเทสต์ที่ล้มก่อน**

`tests/api.test.js`:

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createApiHandler } from '../server/api.js'
import { createMovieService } from '../server/movies.js'

const handle = createApiHandler({ movieService: createMovieService('') })
async function request(path, { method = 'GET', ip = '1.1.1.1' } = {}) {
  const response = await handle(
    new Request('http://localhost/api' + path, {
      method,
      headers: { 'x-forwarded-for': ip },
    }),
  )
  return { status: response.status, data: await response.json(), response }
}

test('legacy account, library and share routes are gone', async () => {
  for (const [path, method] of [
    ['/auth/me', 'GET'],
    ['/auth/login', 'POST'],
    ['/library', 'GET'],
    ['/sharing', 'PATCH'],
    ['/s/' + 'a'.repeat(64), 'GET'],
  ])
    assert.equal((await request(path, { method })).status, 404, method + path)
})

test('sample search, filters, sorting, detail and invalid IDs', async () => {
  const search = await request('/movies?q=INTER')
  assert.equal(search.data.mode, 'demo')
  assert.equal(search.data.results[0].id, 157336)
  const genre = await request('/movies?genre=16&sort=rating')
  assert.ok(genre.data.results.every((movie) => movie.genre_ids.includes(16)))
  assert.ok(
    genre.data.results[0].vote_average >= genre.data.results[1].vote_average,
  )
  assert.equal((await request('/movies?q=no-such-film')).data.results.length, 0)
  assert.equal((await request('/movies/157336')).data.runtime, 169)
  assert.equal((await request('/movies/invalid')).status, 404)
  assert.equal((await request('/movies/0')).status, 404)
  assert.ok((await request('/genres')).data.genres.length > 5)
  assert.equal((await request('/config')).data.mode, 'demo')
})

test('responses are JSON, uncached, with Thai error messages', async () => {
  const { response, data } = await request('/movies/0')
  assert.equal(
    response.headers.get('content-type'),
    'application/json; charset=utf-8',
  )
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.equal(data.error, 'ไม่พบหนังเรื่องนี้')
})

test('rate limit is per client IP', async () => {
  const limited = createApiHandler({
    movieService: createMovieService(''),
    limit: 2,
  })
  const call = (ip) =>
    limited(
      new Request('http://localhost/api/genres', {
        headers: { 'x-forwarded-for': ip + ', 10.0.0.1' },
      }),
    )
  assert.equal((await call('2.2.2.2')).status, 200)
  assert.equal((await call('2.2.2.2')).status, 200)
  const blocked = await call('2.2.2.2')
  assert.equal(blocked.status, 429)
  assert.equal(
    (await blocked.json()).error,
    'มีคำขอมากเกินไป กรุณารอประมาณหนึ่งนาที',
  )
  assert.equal((await call('3.3.3.3')).status, 200)
})

test('unexpected errors hide details', async () => {
  const broken = createApiHandler({
    movieService: {
      mode: 'demo',
      genres: async () => {
        throw new Error('secret token abc')
      },
    },
  })
  const response = await broken(new Request('http://localhost/api/genres'))
  assert.equal(response.status, 500)
  assert.deepEqual(await response.json(), {
    error: 'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง',
  })
})
```

- [ ] **Step 2: รันให้ล้ม**

Run: `node --test tests/api.test.js`
Expected: FAIL — `Cannot find module '.../server/api.js'`

- [ ] **Step 3: เขียน `server/api.js`**

```js
import { HttpError } from './movies.js'

// Web Request → Response so the same code runs in a Next.js Route Handler and in node --test.
export function createApiHandler({ movieService, limit = 240 }) {
  const attempts = new Map()
  function rateLimit(request) {
    const now = Date.now()
    for (const [key, value] of attempts)
      if (value.until < now) attempts.delete(key)
    const key =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local'
    const entry = attempts.get(key) || { count: 0, until: now + 60000 }
    entry.count++
    attempts.set(key, entry)
    if (entry.count > limit)
      throw new HttpError(429, 'มีคำขอมากเกินไป กรุณารอประมาณหนึ่งนาที')
  }
  const json = (status, value) =>
    new Response(JSON.stringify(value), {
      status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    })
  return async (request) => {
    try {
      rateLimit(request)
      const url = new URL(request.url)
      const path = url.pathname
      const get = request.method === 'GET' || request.method === 'HEAD'
      if (get && path === '/api/config')
        return json(200, { mode: movieService.mode })
      if (get && path === '/api/genres')
        return json(200, await movieService.genres())
      if (get && path === '/api/movies')
        return json(200, await movieService.list(url.searchParams))
      if (get && /^\/api\/movies\/[^/]+$/.test(path))
        return json(200, await movieService.detail(path.split('/').at(-1)))
      throw new HttpError(404, 'ไม่พบหน้าที่ต้องการ')
    } catch (error) {
      if (!error.status) console.error('Request failed:', error.message)
      return json(error.status || 500, {
        error: error.status ? error.message : 'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง',
      })
    }
  }
}
```

หมายเหตุ: การเช็ค `Origin` สำหรับ non-GET ของเดิมไม่ต้องย้าย เพราะ API ไม่มี route ที่เขียนข้อมูลแล้ว และ Route Handler จะ export แค่ `GET` (Next ตอบ 405 ให้ method อื่นเอง)

- [ ] **Step 4: เขียน `server/service.js`**

```js
import 'server-only'
import { createMovieService } from './movies.js'

// One instance per server process so the TMDB in-memory cache is shared by pages and /api.
export const movieService =
  process.env.CINESHELF_SAMPLE_CATALOG === '1'
    ? createMovieService('')
    : createMovieService(process.env.TMDB_READ_TOKEN, process.env.TMDB_API_KEY)
```

(`server-only` ติดตั้งใน Task 3 Step 3 — ไฟล์นี้ยังไม่ถูก import จนกว่าจะถึง Task 3 และห้าม import จาก `tests/` เพราะ `server-only` จะ throw นอก Next)

- [ ] **Step 5: รันให้ผ่าน**

Run: `node --test tests/api.test.js && npm test`
Expected: PASS ทั้งหมด (`tests/server.test.js` เดิมยังผ่าน เพราะยังไม่ได้ลบ `server/index.js`)

- [ ] **Step 6: ถามผู้ใช้ก่อน commit**

```bash
git add server/api.js server/service.js tests/api.test.js
git commit -m "feat(api): add Web Request handler for movie API"
```

---

### Task 3: สลับไป Next.js (ทุกหน้ายังเป็น client)

ย้ายทั้งแอปในครั้งเดียว เพราะ React Router กับ Next router อยู่ร่วมกันไม่ได้ จบ task นี้ทุกหน้าต้องทำงานเหมือนเดิม 100% (ยังไม่มี Server Component ที่ดึงข้อมูล — ทำใน Task 4–5)

**Files:**
- Modify: `package.json`, `.gitignore`, `.env.example`, `tsconfig.json`
- Create: `next.config.mjs`, `postcss.config.mjs`
- Create: `src/app/layout.jsx`, `src/app/providers.jsx`, `src/app/not-found.jsx`, `src/app/api/[...path]/route.js`, `src/app/page.jsx`, `src/app/movies/page.jsx`, `src/app/movies/[id]/page.jsx`, `src/app/library/page.jsx`, `src/app/login/page.jsx`, `src/app/register/page.jsx`, `src/app/settings/profile/page.jsx`, `src/app/u/[username]/page.jsx`, `src/app/about/page.jsx`
- Create: `src/components/Redirect.jsx`
- Move: `src/pages/` → `src/views/` · `src/components/Layout.jsx` → `src/components/SiteShell.jsx`
- Modify: ทุกไฟล์ที่ import `react-router-dom` (12 ไฟล์), `src/lib/supabaseConfig.js`, `src/lib/supabase.js`, `src/components/SetupNotice.jsx`, `src/context/*.jsx`, `tests/supabase-config.test.js`, `tests/rls.test.js`
- Delete: `index.html`, `vite.config.js`, `scripts/dev.js`, `server/index.js`, `api/index.js`, `src/main.jsx`, `src/App.jsx`, `src/vite-env.d.ts`, `tests/server.test.js`

**Interfaces:**
- Consumes: `createApiHandler`, `movieService` (Task 2)
- Produces: `src/views/MovieDetail.jsx`, `src/views/Home.jsx` (client ชั่วคราว, Task 4–5 จะแก้) · `<Redirect to="/path" />` · `SiteShell({ children })` · `MovieCollection({ category })`

- [ ] **Step 1: แก้เทสต์ env ให้ใช้ชื่อใหม่ (ล้มก่อน)**

ใน `tests/supabase-config.test.js` แทนที่ทุก `VITE_SUPABASE_URL` → `NEXT_PUBLIC_SUPABASE_URL` และ `VITE_SUPABASE_ANON_KEY` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`:

```bash
sed -i '' 's/VITE_SUPABASE_/NEXT_PUBLIC_SUPABASE_/g' tests/supabase-config.test.js tests/rls.test.js
```

Run: `node --test tests/supabase-config.test.js`
Expected: FAIL ที่ "returns trimmed values when both are set" (ได้ `null`)

- [ ] **Step 2: แก้ `src/lib/supabaseConfig.js` และ `src/lib/supabase.js`**

`src/lib/supabaseConfig.js` บรรทัด 11–12:

```js
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
```

`src/lib/supabase.js` ทั้งไฟล์ (Next ฝังค่าได้เฉพาะเมื่อเขียน `process.env.NEXT_PUBLIC_X` ตรงๆ ส่ง `process.env` ทั้งก้อนไม่ได้):

```js
import { createClient } from '@supabase/supabase-js'
import { readSupabaseConfig } from './supabaseConfig.js'
// Spelled out: Next only inlines literal process.env.NEXT_PUBLIC_* reads into the browser bundle.
const config = readSupabaseConfig({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
})
export const supabaseConfigured = Boolean(config)
export const supabase = config ? createClient(config.url, config.anonKey) : null
```

`src/components/SetupNotice.jsx` บรรทัด 11–12:

```jsx
        NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co{'\n'}
        NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

`.env.example` แทนสองบรรทัด `VITE_...` ด้วย:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

และแก้คอมเมนต์ `# Tests only ... Never prefix with VITE_.` → `Never prefix with NEXT_PUBLIC_.` · ลบบรรทัด `PORT=3001`

Run: `node --test tests/supabase-config.test.js`
Expected: PASS

- [ ] **Step 3: เปลี่ยน dependency และ scripts**

```bash
npm uninstall react-router-dom @tailwindcss/vite vite @vitejs/plugin-react
npm install next@^16.3.8 @tailwindcss/postcss@^4.3.3 server-only
```

ใน `package.json` แทน `scripts` ด้วย:

```json
  "scripts": {
    "dev": "next dev -p 5175",
    "build": "next build",
    "start": "next start",
    "test": "node --env-file-if-exists=.env --test tests/*.test.js tests/*.test.ts",
    "typecheck": "tsc --noEmit"
  },
```

- [ ] **Step 4: config ไฟล์ใหม่**

`next.config.mjs`:

```js
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
]
export default {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
}
```

`postcss.config.mjs`:

```js
export default { plugins: { '@tailwindcss/postcss': {} } }
```

`.gitignore` เพิ่มท้ายไฟล์:

```
.next/
next-env.d.ts
```

ลบไฟล์ Vite/Node server เดิม:

```bash
git rm index.html vite.config.js scripts/dev.js server/index.js api/index.js src/main.jsx src/App.jsx src/vite-env.d.ts tests/server.test.js
```

- [ ] **Step 5: ย้ายไฟล์**

```bash
git mv src/pages src/views
git mv src/components/Layout.jsx src/components/SiteShell.jsx
```

- [ ] **Step 6: `'use client'` ให้ไฟล์ที่ใช้ hook/event/context**

ใส่บรรทัดแรก `'use client'` (ตามด้วยบรรทัดว่าง) ใน:
`src/context/AuthContext.jsx`, `src/context/LibraryContext.jsx`, `src/components/SiteShell.jsx`, `src/components/MovieCard.jsx`, `src/components/LibraryButtons.jsx`, `src/components/MovieCollection.jsx`, `src/components/States.jsx`, `src/views/Home.jsx`, `src/views/Movies.jsx`, `src/views/MovieDetail.jsx`, `src/views/Library.jsx`, `src/views/Auth.jsx`, `src/views/Profile.jsx`, `src/views/ProfileSettings.jsx`

ไม่ใส่ใน: `src/hooks/useFetch.js` (เป็น hook ไม่ใช่ component ถูก import จาก client component อยู่แล้ว), `src/components/Icon.jsx`, `src/components/SetupNotice.jsx`, `src/views/Static.jsx` (ไม่มี hook ใช้ได้ทั้งสองฝั่ง)

- [ ] **Step 7: `src/components/Redirect.jsx`**

```jsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loading } from './States'
// Replaces react-router's <Navigate replace />.
export default function Redirect({ to }) {
  const router = useRouter()
  useEffect(() => router.replace(to), [router, to])
  return <Loading />
}
```

- [ ] **Step 8: แปลง react-router → next ทีละไฟล์**

กฎทั่วไป: `import { Link } from 'react-router-dom'` → `import Link from 'next/link'` และทุก `<Link to=` → `<Link href=` (`grep -rn "to=" src` ต้องไม่เหลือใน `<Link`)

`src/components/States.jsx`, `src/components/MovieCard.jsx`, `src/views/Static.jsx` — แค่กฎทั่วไป

`src/components/LibraryButtons.jsx`:

```jsx
import Link from 'next/link'
import { usePathname } from 'next/navigation'
```

และใน component: `const location = useLocation()` → `const pathname = usePathname()` · `encodeURIComponent(location.pathname)` → `encodeURIComponent(pathname)`

`src/components/SiteShell.jsx` — import และส่วนบน:

```jsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '../context/AuthContext'
import { useLibrary } from '../context/LibraryContext'
import Icon from './Icon'
// react-router's NavLink set class "active"; index.css styles nav > a.active.
function NavItem({ href, end = false, children }) {
  const pathname = usePathname()
  const active = end ? pathname === href : pathname.startsWith(href)
  return (
    <Link
      href={href}
      className={active ? 'active' : undefined}
      aria-current={active ? 'page' : undefined}
    >
      {children}
    </Link>
  )
}
export default function SiteShell({ children }) {
  const { user, profile, signOut: endSession, loading, error } = useAuth()
  const { likedIds, toggleError, dismissToggleError } = useLibrary()
  const [logoutError, setLogoutError] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  async function signOut() {
    setLoggingOut(true)
    try {
      await endSession()
      router.push('/')
    } catch (error) {
      setLogoutError(error.message)
    } finally {
      setLoggingOut(false)
    }
  }
```

ส่วน JSX: `<NavLink to="/" end>` → `<NavItem href="/" end>`, `<NavLink to="/movies">` → `<NavItem href="/movies">`, `<NavLink to="/library">` → `<NavItem href="/library">` (ปิดแท็กเป็น `</NavItem>`) · `<main id="main" key={location.pathname}>` → `<main id="main" key={pathname}>` · `<Outlet />` → `{children}` · `<Link to=` → `<Link href=`

`src/views/Home.jsx`:

```jsx
import Link from 'next/link'
import { useRouter } from 'next/navigation'
```

`const navigate = useNavigate()` → `const router = useRouter()` · `navigate(` → `router.push(`

`src/views/Movies.jsx`:

```jsx
import { useRouter, useSearchParams } from 'next/navigation'
```

แทน `const [params, setParams] = useSearchParams()` ด้วย:

```jsx
  const params = useSearchParams()
  const router = useRouter()
  const setParams = (next) =>
    router.replace('/movies' + (next.size ? '?' + next : ''), { scroll: false })
```

และแก้สองจุดที่เรียก `setParams(next, { replace: true })` → `setParams(next)` · เอา `setParams` ออกจาก dependency array ของ `useEffect` ตัว debounce (เหลือ `[draft, q, params]`) เพราะสร้างใหม่ทุก render

`src/views/MovieDetail.jsx`:

```jsx
import Link from 'next/link'
import { useParams } from 'next/navigation'
```

`src/views/Profile.jsx`: `import { useParams } from 'next/navigation'`

`src/views/Library.jsx`:

```jsx
import Link from 'next/link'
import Redirect from '../components/Redirect'
```

`<Navigate to="/login?next=/library" replace />` → `<Redirect to="/login?next=/library" />`

`src/views/ProfileSettings.jsx`: เหมือน Library (`<Navigate to="/login?next=/settings/profile" replace />` → `<Redirect to="/login?next=/settings/profile" />`)

`src/views/Auth.jsx`:

```jsx
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import Redirect from '../components/Redirect'
```

`const [params] = useSearchParams()` → `const params = useSearchParams()` · `<Navigate to={next} replace />` → `<Redirect to={next} />`

Run: `grep -rn "react-router\|Navigate\|useLocation\|useNavigate\|Outlet\|<Link to=\|import.meta" src`
Expected: ไม่มีผลลัพธ์

- [ ] **Step 9: root layout + providers + API route**

`src/app/providers.jsx`:

```jsx
'use client'

import { AuthProvider, useAuth } from '../context/AuthContext'
import { LibraryProvider } from '../context/LibraryContext'
import { supabaseConfigured } from '../lib/supabase'
import SetupNotice from '../components/SetupNotice'
import SiteShell from '../components/SiteShell'
function LibraryRoot({ children }) {
  const { user } = useAuth()
  // Keyed by account so switching users never shows the previous account's items.
  return (
    <LibraryProvider key={user?.id || 'guest'}>
      <SiteShell>{children}</SiteShell>
    </LibraryProvider>
  )
}
export default function Providers({ children }) {
  if (!supabaseConfigured) return <SetupNotice />
  return (
    <AuthProvider>
      <LibraryRoot>{children}</LibraryRoot>
    </AuthProvider>
  )
}
```

`src/app/layout.jsx`:

```jsx
import '../index.css'
import Providers from './providers'
export const metadata = {
  title: 'CineShelf — Your stories, your shelf.',
  description: 'CineShelf — ห้องสมุดส่วนตัวสำหรับหนังเรื่องโปรดของคุณ',
  icons: { icon: '/favicon.svg' },
}
export const viewport = { themeColor: '#101112' }
export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

`src/app/api/[...path]/route.js`:

```js
import { createApiHandler } from '../../../../server/api.js'
import { movieService } from '../../../../server/service.js'
export const GET = createApiHandler({ movieService })
```

`src/app/not-found.jsx`:

```jsx
import { NotFound } from '../views/Static'
export default NotFound
```

- [ ] **Step 10: page.jsx ทุก route**

`src/app/page.jsx`:

```jsx
import Home from '../views/Home'
export default Home
```

`src/app/movies/[id]/page.jsx`:

```jsx
import MovieDetail from '../../../views/MovieDetail'
export default MovieDetail
```

`src/app/u/[username]/page.jsx`:

```jsx
import Profile from '../../../views/Profile'
export default Profile
```

`src/app/library/page.jsx`:

```jsx
import Library from '../../views/Library'
export default Library
```

`src/app/settings/profile/page.jsx`:

```jsx
import ProfileSettings from '../../../views/ProfileSettings'
export default ProfileSettings
```

`src/app/about/page.jsx`:

```jsx
import { About } from '../../views/Static'
export default About
```

หน้าที่ใช้ `useSearchParams` ต้องห่อ `<Suspense>` (ไม่งั้น `next build` ล้ม):

`src/app/movies/page.jsx`:

```jsx
import { Suspense } from 'react'
import Movies from '../../views/Movies'
import { Loading } from '../../components/States'
export default function MoviesPage() {
  return (
    <Suspense fallback={<Loading cards />}>
      <Movies />
    </Suspense>
  )
}
```

`src/app/login/page.jsx`:

```jsx
import { Suspense } from 'react'
import Auth from '../../views/Auth'
import { Loading } from '../../components/States'
export default function LoginPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Auth />
    </Suspense>
  )
}
```

`src/app/register/page.jsx`:

```jsx
import { Suspense } from 'react'
import Auth from '../../views/Auth'
import { Loading } from '../../components/States'
export default function RegisterPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Auth register />
    </Suspense>
  )
}
```

- [ ] **Step 11: env ในเครื่อง**

ใน `.env` ของตัวเอง เปลี่ยนชื่อ `VITE_SUPABASE_URL` → `NEXT_PUBLIC_SUPABASE_URL` และ `VITE_SUPABASE_ANON_KEY` → `NEXT_PUBLIC_SUPABASE_ANON_KEY` (ค่าเดิม) **ผู้ใช้ทำเอง — agent ห้ามอ่าน/แก้ `.env`**

- [ ] **Step 12: build + test**

Run: `npm run build`
Expected: สำเร็จ · Next จะแก้ `tsconfig.json` เอง (เพิ่ม `plugins`, `include` `next-env.d.ts` และ `.next/types/**/*.ts`) — เก็บการแก้นั้นไว้ · ตาราง route ต้องมี `/`, `/about`, `/api/[...path]`, `/library`, `/login`, `/movies`, `/movies/[id]`, `/register`, `/settings/profile`, `/u/[username]`

ถ้า build ล้มที่ขั้น "Running TypeScript" เพราะ TypeScript 7 (`typescript@^7`) ไม่เข้ากับ type checker ของ Next ให้เพิ่มใน `next.config.mjs` แล้ว build ใหม่ (type check ยังรันได้ด้วย `npm run typecheck`):

```js
  typescript: { ignoreBuildErrors: true },
```

Run: `npm test && npm run typecheck`
Expected: PASS (rls SKIP ถ้าไม่มี env)

- [ ] **Step 13: ลองใช้จริง**

Run: `npm run dev` แล้วเปิด http://localhost:5175
ตรวจ: หน้าแรกขึ้นการ์ดหนัง · `/movies` ค้นหา `inter` แล้ว URL เปลี่ยนเป็น `?q=inter` · กดหนังเข้า `/movies/157336` · `/movies/abc` ขึ้น "ไม่พบหนังเรื่องนี้" · สมัคร/ล็อกอิน/กดถูกใจ/ออกจากระบบได้ · เมนูที่อยู่ถูกไฮไลต์ · `curl -s localhost:5175/api/genres | head -c 80` ได้ JSON

- [ ] **Step 14: ถามผู้ใช้ก่อน commit**

```bash
git add -A
git commit -m "refactor: migrate from Vite and React Router to Next.js App Router"
```

---

### Task 4: Server Component #1 — `/movies/[id]`

**Files:**
- Modify: `src/views/MovieDetail.jsx` (เป็น Server Component รับ `movie` prop)
- Modify: `src/app/movies/[id]/page.jsx`
- Create: `src/app/movies/[id]/not-found.jsx`, `src/app/movies/[id]/error.jsx`
- Create: `src/components/FallbackImage.jsx`, `src/components/RefreshButton.jsx`

**Interfaces:**
- Consumes: `movieService.detail(id)` → movie object หรือ throw `HttpError` (`status` 404/502)
- Produces: `FallbackImage({ src, alt, loading, fallback })` · `RefreshButton({ children })` · `MovieDetail({ movie })`

- [ ] **Step 1: client islands**

`src/components/FallbackImage.jsx`:

```jsx
'use client'

import { useState } from 'react'
// Server Components cannot attach onError, so broken TMDB images swap to the fallback here.
export default function FallbackImage({ src, alt, loading, fallback = null }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) return fallback
  return (
    <img src={src} alt={alt} loading={loading} onError={() => setFailed(true)} />
  )
}
```

`src/components/RefreshButton.jsx`:

```jsx
'use client'

import { useRouter } from 'next/navigation'
export default function RefreshButton({ children }) {
  const router = useRouter()
  return <button onClick={() => router.refresh()}>{children}</button>
}
```

- [ ] **Step 2: แปลง `src/views/MovieDetail.jsx` เป็น Server Component**

ลบ `'use client'`, `useState`, `useParams`, `useFetch`, `Loading`, `ErrorState` ส่วนบนของไฟล์เป็น:

```jsx
import Link from 'next/link'
import MovieCard from '../components/MovieCard'
import LibraryButtons from '../components/LibraryButtons'
import FallbackImage from '../components/FallbackImage'
import RefreshButton from '../components/RefreshButton'
import { getBackdropUrl, selectTrailer } from '../services/tmdb.ts'
import { poster, year } from '../lib/api'
import Icon from '../components/Icon'
// Server Component: movie is fetched on the server by app/movies/[id]/page.jsx.
export default function MovieDetail({ movie }) {
  const director = movie.credits?.crew?.find(
    (person) => person.job === 'Director',
  )
  const trailer = selectTrailer(movie.videos?.results)
```

(ลบบล็อก `if (loading)` / `if (error)` ทิ้ง — 404 และ error ย้ายไป `not-found.jsx` / `error.jsx`)

แทนบล็อกโปสเตอร์ (`{movie.poster_path && !failedPoster ? (...) : (...)}`) ด้วย:

```jsx
            <FallbackImage
              src={poster(movie.poster_path)}
              alt={'โปสเตอร์ ' + movie.title}
              fallback={<Icon name="film" size={80} />}
            />
```

แทน `<button onClick={retry}>ลองใหม่</button>` ด้วย `<RefreshButton>ลองใหม่</RefreshButton>`

แทน `<LibraryButtons movie={movie} />` ด้วย (ส่งเฉพาะ field ที่ปุ่มใช้ ไม่ส่ง credits/recommendations ทั้งก้อนไป browser):

```jsx
              <LibraryButtons
                movie={{
                  id: movie.id,
                  title: movie.title,
                  poster_path: movie.poster_path,
                }}
              />
```

แทนรูปนักแสดง (`{person.profile_path ? (<img ... onError=.../>) : (<Icon name="user" size={36} />)}`) ด้วย:

```jsx
                    <FallbackImage
                      src={poster(person.profile_path, 'w185')}
                      alt={person.name}
                      loading="lazy"
                      fallback={<Icon name="user" size={36} />}
                    />
```

(เดิมรูปที่โหลดพังถูกซ่อนเหลือกรอบว่าง ตอนนี้แสดงไอคอนแทน — ตั้งใจ)

Run: `grep -n "useState\|useParams\|useFetch\|onError\|onClick\|'use client'" src/views/MovieDetail.jsx`
Expected: ไม่มีผลลัพธ์

- [ ] **Step 3: `src/app/movies/[id]/page.jsx`**

```jsx
import { cache } from 'react'
import { notFound } from 'next/navigation'
import { movieService } from '../../../../server/service.js'
import MovieDetail from '../../../views/MovieDetail'
// cache(): generateMetadata and the page share one lookup per request.
const getMovie = cache(async (id) => {
  try {
    return await movieService.detail(id)
  } catch (error) {
    if (error.status === 404) notFound()
    throw error
  }
})
export async function generateMetadata({ params }) {
  const { id } = await params
  const movie = await getMovie(id)
  return {
    title: movie.title + ' — CineShelf',
    description: movie.overview?.slice(0, 160) || undefined,
  }
}
export default async function MovieDetailPage({ params }) {
  const { id } = await params
  return <MovieDetail movie={await getMovie(id)} />
}
```

- [ ] **Step 4: `not-found.jsx` และ `error.jsx`**

`src/app/movies/[id]/not-found.jsx`:

```jsx
import Link from 'next/link'
import Icon from '../../../components/Icon'
export default function MovieNotFound() {
  return (
    <div className="page">
      <div className="empty" role="alert">
        <Icon name="film" size={36} />
        <h2>ยังโหลดข้อมูลไม่ได้</h2>
        <p>ไม่พบหนังเรื่องนี้</p>
      </div>
      <Link className="text-link" href="/movies">
        ← กลับไปสำรวจหนัง
      </Link>
    </div>
  )
}
```

`src/app/movies/[id]/error.jsx`:

```jsx
'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { startTransition } from 'react'
import { ErrorState } from '../../../components/States'
// Production hides Server Component error messages, so show a fixed Thai message.
const message = new Error('โหลดข้อมูลจาก TMDB ไม่ได้ กรุณาลองอีกครั้ง')
export default function MovieError({ reset }) {
  const router = useRouter()
  function retry() {
    startTransition(() => {
      router.refresh()
      reset()
    })
  }
  return (
    <div className="page">
      <ErrorState error={message} retry={retry} />
      <Link className="text-link" href="/movies">
        ← กลับไปสำรวจหนัง
      </Link>
    </div>
  )
}
```

- [ ] **Step 5: build**

Run: `npm run build`
Expected: สำเร็จ · route `/movies/[id]` เป็น `ƒ` (Dynamic)

- [ ] **Step 6: ตรวจว่าเป็น server render จริง + 404 (Review Focus #1)**

Run (ใช้ sample catalog ให้ผลคงที่):

```bash
CINESHELF_SAMPLE_CATALOG=1 npx next start -p 5176 &
sleep 4
curl -s localhost:5176/movies/157336 | grep -c 'Interstellar'
for id in abc 0 999999999; do curl -s -o /dev/null -w "$id %{http_code}\n" localhost:5176/movies/$id; done
curl -s localhost:5176/movies/abc | grep -c 'ไม่พบหนังเรื่องนี้'
kill %1
```

Expected: บรรทัดแรก ≥ 1 (ชื่อหนังอยู่ใน HTML ตั้งแต่ server ไม่ต้องรอ JS) · `abc 404`, `0 404`, `999999999 404` · บรรทัดสุดท้าย ≥ 1

- [ ] **Step 7: ตรวจ error ของ TMDB (Review Focus #2)**

Run:

```bash
TMDB_READ_TOKEN=invalid TMDB_API_KEY= npx next start -p 5176 &
sleep 4
```

เปิด http://localhost:5176/movies/157336 ใน browser
(ถ้าใน `.env` มี `TMDB_API_KEY` ที่ใช้ได้ Next อาจโหลดค่านั้นทับค่าว่าง ทำให้หน้ายังโหลดได้ ให้ comment `TMDB_API_KEY` ใน `.env` ชั่วคราวระหว่างตรวจข้อนี้)
Expected: เห็น "ยังโหลดข้อมูลไม่ได้" + "โหลดข้อมูลจาก TMDB ไม่ได้ กรุณาลองอีกครั้ง" + ปุ่ม "ลองอีกครั้ง" + ลิงก์กลับ (ไม่มีข้อความอังกฤษของ Next) · จากนั้น `kill %1`

- [ ] **Step 8: ถามผู้ใช้ก่อน commit**

```bash
git add src/views/MovieDetail.jsx src/app/movies src/components/FallbackImage.jsx src/components/RefreshButton.jsx
git commit -m "feat(movies): render movie detail as a Server Component"
```

---

### Task 5: Server Component #2 — หน้าแรก `/`

**Files:**
- Modify: `src/views/Home.jsx` (เป็น Server Component รับ `featured`, `trending`)
- Modify: `src/app/page.jsx`
- Modify: `src/components/MovieCollection.jsx` (รับ `initial`)
- Create: `src/components/HeroSearch.jsx`, `src/components/DiscoveryRoom.jsx`

**Interfaces:**
- Consumes: `movieService.detail('157336')`, `movieService.list(URLSearchParams)` → `{ results, page, total_pages, total_results, mode }`
- Produces: `Home({ featured, trending })` · `DiscoveryRoom({ initial })` · `MovieCollection({ category, initial })`

- [ ] **Step 1: `src/components/HeroSearch.jsx`**

ย้ายฟอร์มค้นหาจาก `Home.jsx` มา (ข้อความ/คลาสเหมือนเดิมทุกตัว):

```jsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Icon from './Icon'
export default function HeroSearch() {
  const [query, setQuery] = useState('')
  const router = useRouter()
  function search(event) {
    event.preventDefault()
    router.push(
      '/movies' +
        (query.trim() ? '?q=' + encodeURIComponent(query.trim()) : ''),
    )
  }
  return (
    <form className="hero-search" onSubmit={search}>
      <Icon name="search" />
      <input
        aria-label="ค้นหาหนังเรื่องโปรด"
        placeholder="วันนี้อยากเก็บหนังเรื่องไหน?"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        maxLength={150}
      />
      <button className="button primary" type="submit">
        ค้นหาหนัง <Icon name="arrow" size={17} />
      </button>
    </form>
  )
}
```

- [ ] **Step 2: `MovieCollection` รับข้อมูลเริ่มต้นจาก server**

`src/components/MovieCollection.jsx`:

```jsx
'use client'

import useFetch from '../hooks/useFetch'
import MovieCard from './MovieCard'
import { Empty, ErrorState, Loading } from './States'
// initial: the server-rendered "trending" list; other categories (or a failed server fetch) load here.
export default function MovieCollection({ category, initial = null }) {
  const preset = category === 'trending' ? initial : null
  const fetched = useFetch(preset ? null : '/api/movies?sort=' + category)
  const { loading, error, retry } = fetched
  const data = preset || fetched.data
  if (loading) return <Loading cards />
  if (error) return <ErrorState error={error} retry={retry} />
  if (!data?.results.length)
    return (
      <Empty
        title="ยังไม่มีหนังในหมวดนี้"
        text="ลองกลับมาดูใหม่ภายหลัง"
        link={false}
      />
    )
  return (
    <div className="movie-grid">
      {data.results.slice(0, 6).map((movie) => (
        <MovieCard key={movie.id} movie={movie} />
      ))}
    </div>
  )
}
```

- [ ] **Step 3: `src/components/DiscoveryRoom.jsx`**

ย้ายแถวปุ่มหมวด + `MovieCollection` จาก `Home.jsx`:

```jsx
'use client'

import { useState } from 'react'
import MovieCollection from './MovieCollection'
const categories = [
  ['trending', 'Trending'],
  ['popular', 'Popular'],
  ['rating', 'Top Rated'],
  ['now_playing', 'Now Playing'],
  ['upcoming', 'Upcoming'],
]
export default function DiscoveryRoom({ initial }) {
  const [category, setCategory] = useState('trending')
  return (
    <>
      <div className="genre-row" aria-label="หมวดภาพยนตร์">
        {categories.map(([id, label]) => (
          <button
            key={id}
            className={category === id ? 'chip selected' : 'chip'}
            aria-pressed={category === id}
            onClick={() => setCategory(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <MovieCollection category={category} initial={initial} />
    </>
  )
}
```

`movie` ใน `trending.results` ที่ส่งเข้า client เป็นข้อมูลรายการธรรมดา (ไม่มี credits) ไม่ต้องตัดฟิลด์

- [ ] **Step 4: แปลง `src/views/Home.jsx` เป็น Server Component**

ลบ `'use client'`, `useState`, `useRouter`, `useFetch`, `MovieCollection`, ฟังก์ชัน `search`, ตัวแปร `category`/`query`/`router` ส่วนบนเป็น:

```jsx
import Link from 'next/link'
import { getBackdropUrl } from '../services/tmdb.ts'
import HeroSearch from '../components/HeroSearch'
import DiscoveryRoom from '../components/DiscoveryRoom'
import Icon from '../components/Icon'
// Server Component: data comes from app/page.jsx; search and category tabs are client islands.
export default function Home({ featured, trending }) {
  return (
```

แทน `<form className="hero-search" ...>...</form>` ทั้งก้อนด้วย `<HeroSearch />`
แทน `<div className="genre-row" aria-label="หมวดภาพยนตร์">...</div>` และ `<MovieCollection category={category} />` ด้วย `<DiscoveryRoom initial={trending} />`
`<Link to=` → `<Link href=` (ถ้ายังเหลือ) · ส่วนที่ใช้ `featured?.` คงไว้เหมือนเดิม (featured อาจเป็น `null`)

Run: `grep -n "useState\|useRouter\|useFetch\|onClick\|onSubmit\|'use client'" src/views/Home.jsx`
Expected: ไม่มีผลลัพธ์

- [ ] **Step 5: `src/app/page.jsx`**

```jsx
import { movieService } from '../../server/service.js'
import Home from '../views/Home'
// ISR: rebuilt at most once an hour; a failed fetch falls back to the client (hero without image, tabs fetch /api).
export const revalidate = 3600
export default async function HomePage() {
  const [featured, trending] = await Promise.all([
    movieService.detail('157336').catch(() => null),
    movieService
      .list(new URLSearchParams({ sort: 'trending' }))
      .catch(() => null),
  ])
  return <Home featured={featured} trending={trending} />
}
```

- [ ] **Step 6: build + ตรวจ**

Run: `npm run build`
Expected: สำเร็จ · route `/` เป็น `○` (Static) พร้อม `Revalidate 1h`

Run:

```bash
CINESHELF_SAMPLE_CATALOG=1 npm run build
CINESHELF_SAMPLE_CATALOG=1 npx next start -p 5176 &
sleep 4
curl -s localhost:5176/ | grep -o 'ดูรายละเอียด [^"]*' | head -3
kill %1
```

Expected: มีชื่อหนัง ≥ 1 เรื่อง (การ์ด trending อยู่ใน HTML ตั้งแต่ server) · จากนั้นรัน `npm run build` อีกครั้งโดยไม่มี `CINESHELF_SAMPLE_CATALOG` เพื่อไม่ให้ `.next` ค้างข้อมูล sample

- [ ] **Step 7: ลองใช้จริง**

`npm run dev` → หน้าแรกการ์ดขึ้นทันทีไม่มี skeleton · กด "Popular" แล้วการ์ดเปลี่ยน (โหลดผ่าน `/api`) · กด "Trending" กลับมาได้ข้อมูลเดิมทันที · ค้นหาจาก hero ไป `/movies?q=...`

- [ ] **Step 8: ถามผู้ใช้ก่อน commit**

```bash
git add src/views/Home.jsx src/app/page.jsx src/components/MovieCollection.jsx src/components/HeroSearch.jsx src/components/DiscoveryRoom.jsx
git commit -m "feat(home): render home page as a Server Component with ISR"
```

---

### Task 6: Browser test, Vercel, เอกสาร

**Files:**
- Modify: `tests/browser.mjs`
- Modify: `vercel.json`
- Modify: `README.md`, `PROPOSAL-BASIC.md`

**Interfaces:**
- Consumes: `CINESHELF_SAMPLE_CATALOG=1` (Task 2), `next dev`

- [ ] **Step 1: `tests/browser.mjs` ใช้ `next dev` แทน Vite + Node server**

แทน import บรรทัด 7, 9, 10 (`createServer` จาก vite, `createApp`, `createMovieService`) ด้วย:

```js
import { spawn } from 'node:child_process'
import { createServer as createNetServer } from 'node:net'
```

แทนรายชื่อ env บรรทัด 12–16 เป็น `'NEXT_PUBLIC_SUPABASE_URL'`, `'NEXT_PUBLIC_SUPABASE_ANON_KEY'`, `'SUPABASE_SERVICE_ROLE_KEY'` และ `process.env.VITE_SUPABASE_URL` → `process.env.NEXT_PUBLIC_SUPABASE_URL`

แทนบล็อกบรรทัด 30–49 (`const backend = ...` ถึง `const origin = ...`) ด้วย:

```js
const port = await new Promise((resolve, reject) => {
  const probe = createNetServer().once('error', reject)
  probe.listen(0, '127.0.0.1', () => {
    const { port } = probe.address()
    probe.close(() => resolve(port))
  })
})
const origin = `http://127.0.0.1:${port}`
// Sample catalog keeps movie data deterministic; Supabase is the real project from .env.
const next = spawn(
  process.execPath,
  ['node_modules/next/dist/bin/next', 'dev', '-p', String(port), '-H', '127.0.0.1'],
  { env: { ...process.env, CINESHELF_SAMPLE_CATALOG: '1' }, stdio: 'inherit' },
)
const deadline = Date.now() + 60000
for (;;) {
  try {
    if ((await fetch(origin + '/api/config')).ok) break
  } catch {}
  if (Date.now() > deadline) throw new Error('next dev did not start in 60s')
  await new Promise((resolve) => setTimeout(resolve, 500))
}
// Compile every route once so the 15s page timeouts measure the app, not the first compile.
for (const path of ['/', '/movies', '/movies/157336', '/login', '/register', '/library', '/settings/profile', '/u/x', '/about'])
  await fetch(origin + path)
```

แทนสองบรรทัดใน `finally` (`await vite.close()` และ `await new Promise((resolve) => backend.close(resolve))`) ด้วย:

```js
  next.kill('SIGTERM')
```

แก้คอมเมนต์บรรทัด 1 เป็น `// node --env-file=.env tests/browser.mjs  (starts next dev itself; stop npm run dev first)`

- [ ] **Step 2: รัน browser test**

Run: `node --env-file=.env tests/browser.mjs` (ต้องหยุด `npm run dev` ก่อน และติดตั้ง playwright ตาม README)
Expected: `Browser checks passed ...` · ถ้า SKIP เพราะ env ไม่ครบ ให้รายงานว่า SKIP (**SKIP ไม่ใช่ผ่าน**)

- [ ] **Step 3: `vercel.json`**

แทนทั้งไฟล์ (headers ย้ายไป `next.config.mjs` แล้ว, ไม่มี `api/` และ rewrite แล้ว):

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs"
}
```

- [ ] **Step 4: README**

แก้ส่วนที่เกี่ยวกับ Vite ใน `README.md`:
- บรรทัด 15: `เปิด **http://localhost:5175** คำสั่งเดียวเปิดทั้งหน้าเว็บและ API (Next.js)`
- บรรทัด 29–30 และ 33: `VITE_SUPABASE_*` → `NEXT_PUBLIC_SUPABASE_*` · "ห้ามขึ้นต้นด้วย `VITE_`" → "ห้ามขึ้นต้นด้วย `NEXT_PUBLIC_`"
- บรรทัด 47: "ไม่ใช้ `VITE_`" → "ไม่ใช้ `NEXT_PUBLIC_`"
- บรรทัด 73: "Network URL ที่ Vite แสดง" → "Network URL ที่ `next dev` แสดง"
- บรรทัด 82: แทนทั้งย่อหน้าด้วย `npm start` รัน Next.js production server (หน้าเว็บและ `/api` origin เดียวกัน) ตั้ง `TMDB_READ_TOKEN` ใน environment ของโฮสต์ ส่วน `NEXT_PUBLIC_SUPABASE_URL` กับ `NEXT_PUBLIC_SUPABASE_ANON_KEY` ต้องมีตอน `npm run build` เพราะ Next ฝังค่าลงในโค้ดฝั่ง browser ตอน build และต้องเพิ่มโดเมนจริงใน Supabase → Authentication → URL Configuration
- บรรทัด 140: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` → `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- เพิ่มหัวข้อใหม่ก่อนหัวข้อเทสต์:

```markdown
## Server Component กับ Client Component

| หน้า | ประเภท | เหตุผล |
| --- | --- | --- |
| `/` (`src/app/page.jsx`) | Server | ดึงหนังเด่นและ trending จาก TMDB บน server ด้วย token ที่ไม่ส่งไป browser · HTML มีข้อมูลตั้งแต่โหลดแรก · ISR อัปเดตทุก 1 ชั่วโมง |
| `/movies/[id]` (`src/app/movies/[id]/page.jsx`) | Server | ดึงรายละเอียดหนังบน server ไม่มีหน้า loading · title ของหน้าเป็นชื่อหนัง · id ผิดได้ 404 จริง |
| หน้าอื่นทั้งหมด | Client | ต้องใช้ session ของ Supabase ใน browser หรือรับ input ผู้ใช้ (ฟอร์ม, ค้นหา, ปุ่มถูกใจ) |
```

- [ ] **Step 5: `PROPOSAL-BASIC.md` ข้อ 3**

แทนแถวแรกสองแถวของตารางข้อ 3 ("ดึงข้อมูลหนังจาก TMDB" และ "แสดงรายการและรายละเอียดหนัง") ด้วย:

```markdown
| หน้าแรก `src/app/page.jsx` | Server Component | ดึงหนังเด่นและหนังมาแรงจาก TMDB บนเซิร์ฟเวอร์ token ไม่หลุดไปเบราว์เซอร์ และหน้าโหลดมาพร้อมข้อมูลเลย ไม่ต้องรอ JS |
| รายละเอียดหนัง `src/app/movies/[id]/page.jsx` | Server Component | ดึงรายละเอียดหนังบนเซิร์ฟเวอร์ ไม่มีหน้า loading ชื่อแท็บเป็นชื่อหนัง (ดีต่อ SEO) และ id ผิดได้หน้า 404 จริง |
| รายการหนัง/ค้นหา `/movies` | Client | ต้องรับค่าที่ผู้ใช้พิมพ์ เปลี่ยน URL และโหลดผลใหม่ทันที โดยเรียก `/api/movies` (Route Handler ฝั่ง server ที่ถือ token) |
```

และลบแถว "ช่องค้นหาและตัวกรอง" (ถูกรวมในแถวใหม่แล้ว)

- [ ] **Step 6: ตรวจทั้งหมดอีกรอบ**

Run: `npm test && npm run typecheck && npm run build`
Expected: PASS ทั้งหมด

- [ ] **Step 7: ถามผู้ใช้ก่อน commit**

```bash
git add tests/browser.mjs vercel.json README.md PROPOSAL-BASIC.md
git commit -m "chore: run browser test on Next.js, update Vercel config and docs"
```

- [ ] **Step 8: ขั้นตอนที่ผู้ใช้ต้องทำเองบน Vercel (ก่อน deploy)**

1. Vercel → Project → Settings → Environment Variables: เพิ่ม `NEXT_PUBLIC_SUPABASE_URL` และ `NEXT_PUBLIC_SUPABASE_ANON_KEY` (ค่าเดียวกับ `VITE_` เดิม) ทุก environment แล้วลบตัว `VITE_` ทิ้ง
2. Settings → Build and Deployment: Framework Preset = **Next.js**, ล้าง Output Directory ที่เคยตั้งเป็น `dist` (ถ้ามี)
3. Deploy preview แล้วเปิด `/`, `/movies/157336`, `/movies/abc`, ล็อกอิน, กดถูกใจ
