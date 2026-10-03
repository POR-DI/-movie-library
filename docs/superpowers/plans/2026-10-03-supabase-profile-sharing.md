# CineShelf → Supabase + Profile Sharing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ย้ายบัญชีและห้องสมุดของ CineShelf จาก SQLite + localStorage ไป Supabase และเพิ่มหน้าโปรไฟล์ `/u/:username` ที่เจ้าของเลือกสาธารณะ/ส่วนตัวได้ เพื่อนเห็นเฉพาะหนังที่กดถูกใจ

**Architecture:** React (Vite) เรียก Supabase ตรงด้วย anon key โดยสิทธิ์ทั้งหมดบังคับด้วย RLS ใน Postgres · Node server เหลือหน้าที่ proxy TMDB และเสิร์ฟ `dist` · global state ใช้ `AuthContext` + `LibraryContext` · logic ที่ทดสอบได้แยกเป็น pure functions ใน `src/lib/`

**Tech Stack:** React 19, Vite 8, React Router 7, react-hook-form + zod 4, `@supabase/supabase-js` v2, Node 24 (`node --test`), Playwright (browser test, optional)

**Spec:** `docs/superpowers/specs/2026-10-03-supabase-profile-sharing-design.md`

## Global Constraints

- Node `>=22.13.0` (เครื่องนี้ v24.19.0) · ห้ามเพิ่ม dependency อื่นนอกจาก `@supabase/supabase-js`
- username: `^[a-z0-9_]{3,20}$` — regex เดียวกันทั้ง zod และ SQL `check`
- display_name: ยาว 1–50 ตัวอักษร
- `kind` มีแค่ `'liked'` และ `'watchlist'`
- env ฝั่ง client: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` · `SUPABASE_SERVICE_ROLE_KEY` ใช้เฉพาะ `tests/` ห้าม import ใน `src/`
- โปรไฟล์ใหม่ `is_public = false` เสมอ
- ไม่พบโปรไฟล์ และ โปรไฟล์ส่วนตัว ต้องแสดงข้อความเดียวกัน: `ไม่พบโปรไฟล์ หรือโปรไฟล์นี้เป็นส่วนตัว`
- ข้อความ UI เป็นภาษาไทย ไม่ใช้ `letter-spacing` กับข้อความไทย
- git: email `pordiewtrakul@gmail.com` · **ห้าม commit โดยไม่ถามผู้ใช้ก่อน** · ห้ามใส่ `Co-Authored-By` · message รูปแบบ `type(scope): desc`
- โค้ดสไตล์เดิม: ไม่มี semicolon, single quote, 2 spaces (`.prettierrc.json`)

## Review Focus

1. **กดปุ่มหลายเรื่องรัวๆ แล้วเรื่องหนึ่งบันทึกพลาด** — rollback ต้องคืนเฉพาะเรื่องที่พลาด ไม่ลบผลของเรื่องอื่นที่สำเร็จไปแล้ว → `tests/library.test.js` "revert does not clobber concurrent toggle" (Task 1)
2. **เปิด `/u/Por_01` (ตัวพิมพ์ใหญ่) หรือมีช่องว่าง** — ต้องหาเจอเหมือน `/u/por_01` → `normalizeUsername` + test (Task 1), ใช้ใน `fetchProfile` (Task 6)
3. **username ชนตอนสมัคร (ชื่อว่างตอนเช็ค แต่มีคนแย่งไปก่อนกดส่ง)** — Supabase ตอบ `Database error saving new user` ต้องแปลเป็น `ชื่อผู้ใช้นี้ถูกใช้แล้ว` → unit test (Task 1) + RLS test ยืนยันว่า message จริงตรงกับที่ map (Task 3)
4. **เจ้าของเปิดลิงก์โปรไฟล์ส่วนตัวของตัวเอง** — ต้องเห็นรายการพร้อมป้าย "ส่วนตัว — มีแค่คุณที่เห็น" ไม่ใช่หน้าไม่พบ → RLS test "owner sees own private profile" (Task 3) + browser step (Task 8)
5. **ลืมตั้ง `.env`** — แอปต้องแสดงวิธีตั้งค่า ไม่ใช่จอขาว → `readSupabaseConfig` unit test (Task 4)

---

## File Map

| ไฟล์ | สถานะ | รับผิดชอบ |
| --- | --- | --- |
| `src/lib/library.js` | ใหม่ | pure: `idsOf`, `applyToggle`, `revertToggle`, `itemToMovie` |
| `src/lib/supabaseErrors.js` | ใหม่ | `toThaiMessage(error)` |
| `src/lib/supabaseConfig.js` | ใหม่ | `readSupabaseConfig(env)` (pure, ทดสอบใน Node ได้) |
| `src/lib/supabase.js` | ใหม่ | `supabaseConfigured`, `supabase` client |
| `src/lib/profiles.js` | ใหม่ | `usernameAvailable(name)`, `fetchProfile(username)` |
| `src/schemas/auth.js` | แก้ | `normalizeUsername`, `usernameSchema`, `registerSchema`, `profileSchema` |
| `src/context/AuthContext.jsx` | เขียนใหม่ | session/profile + signUp/signIn/signOut/updateProfile |
| `src/context/LibraryContext.jsx` | เขียนใหม่ | items + toggle optimistic |
| `src/components/LibraryButtons.jsx` | ใหม่ | ปุ่ม ♥ / 🔖 (แทน `SaveButton`) |
| `src/components/SetupNotice.jsx` | ใหม่ | หน้าบอกวิธีตั้ง `.env` |
| `src/components/Icon.jsx` | แก้ | เพิ่ม `heart`, `bookmark` |
| `src/components/MovieCard.jsx` | แก้ | ใช้ `LibraryButtons`, ซ่อนคะแนน/ปีถ้าไม่มีข้อมูล |
| `src/components/Layout.jsx` | แก้ | เมนูผู้ใช้ใหม่ |
| `src/pages/Auth.jsx` | แก้ | ช่อง username/displayName |
| `src/pages/Library.jsx` | เขียนใหม่ | แท็บ ถูกใจ/อยากดู |
| `src/pages/MovieDetail.jsx` | แก้ | ใช้ `LibraryButtons`, ลบ `PersonalMovieEditor` |
| `src/pages/ProfileSettings.jsx` | ใหม่ | `/settings/profile` |
| `src/pages/Profile.jsx` | ใหม่ | `/u/:username` |
| `src/App.jsx`, `src/main.jsx` | แก้ | routes + SetupNotice |
| `src/index.css` | แก้ | สไตล์ปุ่มคู่, แท็บ, หน้าโปรไฟล์ |
| `server/index.js` | แก้ | ลบ SQLite/auth/library/share |
| `supabase/schema.sql` | ใหม่ | ตาราง + trigger + RLS + function |
| `tests/library.test.js`, `tests/supabase-errors.test.js`, `tests/auth-schema.test.js`, `tests/supabase-config.test.js` | ใหม่ | unit |
| `tests/rls.test.js` | ใหม่ | RLS กับ Supabase จริง |
| `tests/server.test.js` | แก้ | เหลือเทสต์ TMDB |
| `tests/browser.mjs` | แก้ | flow ใหม่ |
| ลบ | — | `src/pages/Shared.jsx`, `src/components/PersonalMovieEditor.jsx`, `src/storage/portfolio.ts`, `data/` |

---

### Task 0: Git baseline

**Files:** `.gitignore` (ตรวจเท่านั้น)

- [ ] **Step 1: ตรวจ `.gitignore` กันไฟล์ลับ**

Run: `cd ~/Downloads/movie-library && cat .gitignore`
Expected: มี `node_modules/`, `dist/`, `.env`, `data/`, `test-results/`, `.env.local`

- [ ] **Step 2: init + ตั้ง identity เฉพาะ repo**

```bash
git init -b main
git config user.email pordiewtrakul@gmail.com
git config user.name "Por Diewtrakul"
git status --short | grep -E '\.env$|\.env\.local$|sqlite' && echo "LEAK" || echo "clean"
```
Expected: `clean`

- [ ] **Step 3: บันทึกผลเทสต์ baseline**

Run: `npm test 2>&1 | tail -15`
Expected: บันทึกจำนวน pass/fail ไว้ในรายงาน (ใช้เทียบหลังแก้ — ถ้ามีเทสต์ที่ fail อยู่ก่อนแล้ว ให้แจ้งผู้ใช้ ไม่ใช่แก้เงียบ)

Run: `npm run build && npm install --no-save --package-lock=false playwright && npx playwright install chromium && node tests/browser.mjs 2>&1 | tail -5`
Expected: บันทึกว่า browser test เดิม "ผ่าน" หรือ "พังที่ step ไหน" — Task 8 ใช้ผลนี้แยกว่าอะไรพังเพราะเรา อะไรพังมาก่อน

- [ ] **Step 4: ถามผู้ใช้แล้วค่อย commit**

```bash
git add -A
git commit -m "chore: snapshot before Supabase migration"
```

---

### Task 1: Pure logic — library, error mapping, form schemas

**Files:**
- Create: `src/lib/library.js`, `src/lib/supabaseErrors.js`
- Modify: `src/schemas/auth.js`
- Test: `tests/library.test.js`, `tests/supabase-errors.test.js`, `tests/auth-schema.test.js`
- Modify: `package.json` (dependency)

**Interfaces:**
- Produces:
  - `idsOf(items: Item[], kind: 'liked'|'watchlist'): Set<number>`
  - `applyToggle(items, movie: {id, title, poster_path}, kind, userId: string): { items: Item[], action: 'insert'|'delete', row: object, removed?: Item }`
  - `revertToggle(items, result): Item[]`
  - `itemToMovie(item): { id, title, poster_path }`
  - `Item = { tmdb_movie_id: number, kind, title: string, poster_path: string|null, created_at: string }`
  - `toThaiMessage(error): string`
  - `normalizeUsername(value: string): string`, `usernameSchema`, `loginSchema`, `registerSchema` (fields: `email, password, confirmPassword, username, displayName`), `profileSchema` (fields: `username, displayName`)

- [ ] **Step 1: ติดตั้ง supabase-js**

Run: `npm install @supabase/supabase-js@^2`
Expected: `package.json` มี `"@supabase/supabase-js": "^2.x"` ใน `dependencies`

- [ ] **Step 2: เขียนเทสต์ library (ต้องแดง)**

`tests/library.test.js`
```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  idsOf,
  applyToggle,
  revertToggle,
  itemToMovie,
} from '../src/lib/library.js'

const interstellar = { id: 157336, title: 'Interstellar', poster_path: '/a.jpg' }
const inception = { id: 27205, title: 'Inception', poster_path: null }

test('idsOf separates liked and watchlist', () => {
  const items = [
    { tmdb_movie_id: 1, kind: 'liked' },
    { tmdb_movie_id: 2, kind: 'watchlist' },
    { tmdb_movie_id: 3, kind: 'liked' },
  ]
  assert.deepEqual([...idsOf(items, 'liked')], [1, 3])
  assert.deepEqual([...idsOf(items, 'watchlist')], [2])
})

test('applyToggle inserts newest first with row for Supabase', () => {
  const result = applyToggle([], interstellar, 'liked', 'u1')
  assert.equal(result.action, 'insert')
  assert.deepEqual(result.row, {
    user_id: 'u1',
    tmdb_movie_id: 157336,
    kind: 'liked',
    title: 'Interstellar',
    poster_path: '/a.jpg',
  })
  assert.equal(result.items[0].tmdb_movie_id, 157336)
  assert.equal(typeof result.items[0].created_at, 'string')
})

test('applyToggle deletes only the matching kind', () => {
  const liked = applyToggle([], interstellar, 'liked', 'u1').items
  const both = applyToggle(liked, interstellar, 'watchlist', 'u1').items
  const result = applyToggle(both, interstellar, 'liked', 'u1')
  assert.equal(result.action, 'delete')
  assert.deepEqual(result.row, {
    user_id: 'u1',
    tmdb_movie_id: 157336,
    kind: 'liked',
  })
  assert.deepEqual([...idsOf(result.items, 'watchlist')], [157336])
  assert.deepEqual([...idsOf(result.items, 'liked')], [])
})

test('revert of insert removes only that item', () => {
  const first = applyToggle([], interstellar, 'liked', 'u1')
  const second = applyToggle(first.items, inception, 'liked', 'u1')
  // first insert failed after second succeeded
  const reverted = revertToggle(second.items, first)
  assert.deepEqual([...idsOf(reverted, 'liked')], [27205])
})

test('revert does not clobber concurrent toggle', () => {
  const start = applyToggle([], interstellar, 'liked', 'u1').items
  const removing = applyToggle(start, interstellar, 'liked', 'u1')
  const adding = applyToggle(removing.items, inception, 'liked', 'u1')
  // delete of Interstellar failed; Inception insert must survive
  const reverted = revertToggle(adding.items, removing)
  assert.deepEqual(
    [...idsOf(reverted, 'liked')].sort((a, b) => a - b),
    [27205, 157336],
  )
})

test('revert of delete does not duplicate an item already present', () => {
  const start = applyToggle([], interstellar, 'liked', 'u1').items
  const removing = applyToggle(start, interstellar, 'liked', 'u1')
  const reverted = revertToggle(start, removing)
  assert.equal(reverted.length, 1)
})

test('itemToMovie maps a stored row to MovieCard shape', () => {
  assert.deepEqual(
    itemToMovie({
      tmdb_movie_id: 5,
      kind: 'liked',
      title: 'X',
      poster_path: null,
      created_at: '',
    }),
    { id: 5, title: 'X', poster_path: null },
  )
})
```

- [ ] **Step 3: รันให้เห็นแดง**

Run: `node --test tests/library.test.js`
Expected: FAIL — `Cannot find module '.../src/lib/library.js'`

- [ ] **Step 4: เขียน `src/lib/library.js`**

```js
const same = (item, id, kind) =>
  item.tmdb_movie_id === id && item.kind === kind

export const idsOf = (items, kind) =>
  new Set(items.filter((i) => i.kind === kind).map((i) => i.tmdb_movie_id))

export function applyToggle(items, movie, kind, userId) {
  const removed = items.find((i) => same(i, movie.id, kind))
  if (removed)
    return {
      action: 'delete',
      row: { user_id: userId, tmdb_movie_id: movie.id, kind },
      removed,
      items: items.filter((i) => i !== removed),
    }
  const row = {
    user_id: userId,
    tmdb_movie_id: movie.id,
    kind,
    title: movie.title,
    poster_path: movie.poster_path ?? null,
  }
  const { user_id, ...item } = row
  return {
    action: 'insert',
    row,
    items: [{ ...item, created_at: new Date().toISOString() }, ...items],
  }
}

// Undo one failed toggle against the latest items, leaving other toggles intact.
export function revertToggle(items, result) {
  const { tmdb_movie_id: id, kind } = result.row
  if (result.action === 'insert')
    return items.filter((i) => !same(i, id, kind))
  if (items.some((i) => same(i, id, kind))) return items
  return [result.removed, ...items].sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  )
}

export const itemToMovie = (item) => ({
  id: item.tmdb_movie_id,
  title: item.title,
  poster_path: item.poster_path,
})
```

- [ ] **Step 5: รันให้เขียว**

Run: `node --test tests/library.test.js`
Expected: PASS 7/7

- [ ] **Step 6: เขียนเทสต์ error mapping (ต้องแดง)**

`tests/supabase-errors.test.js`
```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toThaiMessage } from '../src/lib/supabaseErrors.js'

test('maps known Supabase errors to Thai', () => {
  const cases = [
    [{ code: 'user_already_exists' }, 'อีเมลนี้ถูกใช้งานแล้ว'],
    [{ code: 'email_exists' }, 'อีเมลนี้ถูกใช้งานแล้ว'],
    [{ code: 'invalid_credentials' }, 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'],
    [{ code: 'weak_password' }, 'รหัสผ่านนี้คาดเดาง่ายเกินไป ลองตั้งใหม่'],
    [{ code: '23505' }, 'ชื่อผู้ใช้นี้ถูกใช้แล้ว'],
    [
      { code: 'unexpected_failure', message: 'Database error saving new user' },
      'ชื่อผู้ใช้นี้ถูกใช้แล้ว',
    ],
    [{ code: '42501' }, 'ไม่มีสิทธิ์ทำรายการนี้'],
    [{ code: 'over_request_rate_limit' }, 'มีคำขอมากเกินไป กรุณารอสักครู่'],
    [
      { name: 'AuthRetryableFetchError', message: 'Failed to fetch' },
      'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่',
    ],
    [
      new TypeError('Failed to fetch'),
      'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่',
    ],
  ]
  for (const [error, expected] of cases)
    assert.equal(toThaiMessage(error), expected, JSON.stringify(error))
})

test('unknown errors get a generic message, never raw English', () => {
  assert.equal(
    toThaiMessage({ code: 'something_new', message: 'Boom' }),
    'เกิดข้อผิดพลาด กรุณาลองใหม่',
  )
  assert.equal(toThaiMessage(null), '')
})
```

- [ ] **Step 7: รันให้เห็นแดง**

Run: `node --test tests/supabase-errors.test.js`
Expected: FAIL — module not found

- [ ] **Step 8: เขียน `src/lib/supabaseErrors.js`**

```js
const byCode = {
  user_already_exists: 'อีเมลนี้ถูกใช้งานแล้ว',
  email_exists: 'อีเมลนี้ถูกใช้งานแล้ว',
  invalid_credentials: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
  weak_password: 'รหัสผ่านนี้คาดเดาง่ายเกินไป ลองตั้งใหม่',
  23505: 'ชื่อผู้ใช้นี้ถูกใช้แล้ว',
  42501: 'ไม่มีสิทธิ์ทำรายการนี้',
  over_request_rate_limit: 'มีคำขอมากเกินไป กรุณารอสักครู่',
}
const offline = 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่'

export function toThaiMessage(error) {
  if (!error) return ''
  if (byCode[error.code]) return byCode[error.code]
  // The signup trigger fails as a generic auth error; a username clash is the expected cause
  // because the form already validated every other column.
  if (/Database error saving new user/i.test(error.message || ''))
    return 'ชื่อผู้ใช้นี้ถูกใช้แล้ว'
  if (
    error.name === 'AuthRetryableFetchError' ||
    /Failed to fetch|NetworkError|fetch failed/i.test(error.message || '')
  )
    return offline
  return 'เกิดข้อผิดพลาด กรุณาลองใหม่'
}
```

- [ ] **Step 9: รันให้เขียว**

Run: `node --test tests/supabase-errors.test.js`
Expected: PASS 2/2

- [ ] **Step 10: เขียนเทสต์ schema (ต้องแดง)**

`tests/auth-schema.test.js`
```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeUsername,
  usernameSchema,
  registerSchema,
  profileSchema,
} from '../src/schemas/auth.js'

const valid = {
  email: 'Me@Example.com',
  password: 'password-123',
  confirmPassword: 'password-123',
  username: '  Por_01 ',
  displayName: ' พอ ',
}

test('normalizeUsername trims and lowercases (URL /u/Por_01 works)', () => {
  assert.equal(normalizeUsername('  Por_01 '), 'por_01')
})

test('username must match ^[a-z0-9_]{3,20}$ after normalizing', () => {
  for (const ok of ['abc', 'por_01', 'A_B_C', 'x'.repeat(20)])
    assert.equal(usernameSchema.safeParse(ok).success, true, ok)
  for (const bad of ['ab', 'x'.repeat(21), 'พอ', 'por-01', 'por 01', ''])
    assert.equal(usernameSchema.safeParse(bad).success, false, bad)
})

test('registerSchema normalizes and checks password confirmation', () => {
  const parsed = registerSchema.parse(valid)
  assert.equal(parsed.email, 'me@example.com')
  assert.equal(parsed.username, 'por_01')
  assert.equal(parsed.displayName, 'พอ')
  const mismatch = registerSchema.safeParse({
    ...valid,
    confirmPassword: 'nope-nope',
  })
  assert.equal(mismatch.success, false)
  assert.equal(mismatch.error.issues[0].message, 'รหัสผ่านไม่ตรงกัน')
})

test('displayName is 1-50 characters after trimming', () => {
  assert.equal(
    profileSchema.safeParse({ username: 'abc', displayName: '   ' }).success,
    false,
  )
  assert.equal(
    profileSchema.safeParse({ username: 'abc', displayName: 'ก'.repeat(51) })
      .success,
    false,
  )
  assert.equal(
    profileSchema.safeParse({ username: 'abc', displayName: 'ก' }).success,
    true,
  )
})
```

- [ ] **Step 11: รันให้เห็นแดง**

Run: `node --test tests/auth-schema.test.js`
Expected: FAIL — `normalizeUsername` is not exported

- [ ] **Step 12: แก้ `src/schemas/auth.js` ทั้งไฟล์**

```js
import { z } from 'zod'
export const normalizeUsername = (value) => value.trim().toLowerCase()
export const usernameSchema = z
  .string()
  .transform(normalizeUsername)
  .pipe(
    z
      .string()
      .regex(
        /^[a-z0-9_]{3,20}$/,
        'ชื่อผู้ใช้ใช้ได้เฉพาะ a–z, 0–9 และ _ ยาว 3–20 ตัว',
      ),
  )
const displayName = z
  .string()
  .trim()
  .min(1, 'กรุณากรอกชื่อที่แสดง')
  .max(50, 'ชื่อที่แสดงไม่เกิน 50 ตัวอักษร')
export const loginSchema = z.object({
  email: z
    .email('กรุณากรอกอีเมลให้ถูกต้อง')
    .max(254)
    .transform((value) => value.toLowerCase()),
  password: z
    .string()
    .min(8, 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')
    .max(128, 'รหัสผ่านยาวเกินไป'),
})
export const registerSchema = loginSchema
  .extend({
    username: usernameSchema,
    displayName,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'รหัสผ่านไม่ตรงกัน',
    path: ['confirmPassword'],
  })
export const profileSchema = z.object({ username: usernameSchema, displayName })
```

- [ ] **Step 13: รันทั้งสามไฟล์ให้เขียว**

Run: `node --test tests/library.test.js tests/supabase-errors.test.js tests/auth-schema.test.js`
Expected: PASS ทั้งหมด

- [ ] **Step 14: ถามผู้ใช้แล้วค่อย commit**

```bash
git add package.json package-lock.json src/lib/library.js src/lib/supabaseErrors.js src/schemas/auth.js tests/library.test.js tests/supabase-errors.test.js tests/auth-schema.test.js
git commit -m "feat(lib): add library toggle, Supabase error mapping and username schema"
```

> หมายเหตุ: `server/index.js` ยัง import `registerSchema` และใช้ฟิลด์ `name` อยู่ — `tests/server.test.js` เทสต์แรกจะพังหลัง Task นี้ และถูกลบใน Task 2 (ลำดับนี้ตั้งใจ)

---

### Task 2: Server เหลือแค่ TMDB

**Files:**
- Modify: `server/index.js`
- Modify: `tests/server.test.js`
- Modify: `package.json` (`test` script)

**Interfaces:**
- Produces: `createApp({ movieService? }): http.Server` — ไม่มี `databasePath` แล้ว · routes: `GET /api/config`, `GET /api/genres`, `GET /api/movies`, `GET /api/movies/:id`, static `dist`

- [ ] **Step 1: แก้เทสต์ก่อน — ลบเทสต์บัญชี/แชร์ เพิ่มเทสต์ว่า route เก่าหายจริง**

`tests/server.test.js` — ลบ `test('registration, authentication, ...')` ทั้งก้อน และฟังก์ชัน `account` · แก้ `before` เป็น:
```js
before(async () => {
  server = createApp({ movieService: createMovieService('') })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  origin = 'http://127.0.0.1:' + server.address().port
})
```
แล้วเพิ่ม:
```js
test('legacy account, library and share routes are gone', async () => {
  for (const [path, method] of [
    ['/auth/me', 'GET'],
    ['/auth/login', 'POST'],
    ['/library', 'GET'],
    ['/sharing', 'PATCH'],
    ['/s/' + 'a'.repeat(64), 'GET'],
  ])
    assert.equal(
      (await request(path, { method, body: {} })).status,
      404,
      method + ' ' + path,
    )
})
```

- [ ] **Step 2: รันให้เห็นแดง**

Run: `node --test tests/server.test.js`
Expected: FAIL ที่ `legacy ... routes are gone` (เช่น `/auth/me` ได้ 200)

- [ ] **Step 3: แก้ `server/index.js`**

ลบ: import `DatabaseSync`, `randomBytes/scrypt/timingSafeEqual/createHash`, `promisify`, `mkdirSync`, `dirname`, `loginSchema/registerSchema` · ค่าคงที่ `hashPassword`, `digest`, `newToken`, `week` · ทุกอย่างที่เกี่ยวกับ `db`, `publicUser`, `sessionToken`, `getUser`, `requireUser`, `cookie`, `signIn`, `library`, `body`, `validate` · ทุก route ตั้งแต่ `/api/auth/me` ถึง `/api/s/...` · `server.on('close', () => db.close())`

คง: header ความปลอดภัย, การเสิร์ฟ `dist`, `rateLimit` (เหลือแบบ `:api`), origin check ของ non-GET, routes `/api/config`, `/api/genres`, `/api/movies`, `/api/movies/:id`, 404 สุดท้าย, error handler, ส่วน `listen`

ส่วนหัวไฟล์หลังแก้:
```js
import { createServer } from 'node:http'
import { existsSync, statSync, createReadStream } from 'node:fs'
import { resolve, extname, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createMovieService, HttpError } from './movies.js'

const root = fileURLToPath(new URL('../', import.meta.url))

export function createApp({
  movieService = createMovieService(
    process.env.TMDB_READ_TOKEN,
    process.env.TMDB_API_KEY,
  ),
} = {}) {
  const attempts = new Map()
  function rateLimit(req) {
    const now = Date.now()
    for (const [key, value] of attempts)
      if (value.until < now) attempts.delete(key)
    const key = req.socket.remoteAddress || 'local'
    const entry = attempts.get(key) || { count: 0, until: now + 60000 }
    entry.count++
    attempts.set(key, entry)
    if (entry.count > 240)
      throw new HttpError(429, 'มีคำขอมากเกินไป กรุณารอประมาณหนึ่งนาที')
  }
  // ...createServer handler เดิม ตัดส่วนที่ระบุข้างบน
```

- [ ] **Step 4: ให้ `npm test` โหลด `.env` (สำหรับ RLS test ใน Task 3)**

`package.json`:
```json
"test": "node --env-file-if-exists=.env --test tests/*.test.js tests/*.test.ts",
```

- [ ] **Step 5: รันให้เขียว + ยืนยันไม่มี SQLite หลงเหลือ**

Run: `node --test tests/server.test.js && grep -n "sqlite\|DatabaseSync\|share_token" server/ -r || echo "no sqlite"`
Expected: PASS ทั้งหมด และ `no sqlite`

- [ ] **Step 6: ลบโฟลเดอร์ข้อมูลเก่า (ยืนยันแล้วว่า 0 แถว)**

Run: `rm -rf data`

- [ ] **Step 7: ถามผู้ใช้แล้วค่อย commit**

```bash
git add server/index.js tests/server.test.js package.json
git commit -m "refactor(server): drop SQLite accounts and sharing, keep TMDB proxy"
```

---

### Task 3: Supabase schema + RLS test (ต้องมีโปรเจกต์ Supabase)

**ต้องการจากผู้ใช้:** ทำ Step 1 ให้เสร็จก่อน · ถ้ายังไม่พร้อม ข้ามไป Task 4 แล้วกลับมาทีหลัง (Task 4–7 ไม่ต้องใช้ key ในการเขียนโค้ด แต่ต้องใช้ตอนเปิดแอปจริง)

**Files:**
- Create: `supabase/schema.sql`, `tests/rls.test.js`
- Modify: `.env.example`

**Interfaces:**
- Produces (DB): ตาราง `public.profiles(id, username, display_name, avatar_url, is_public, created_at)`, `public.library_items(id, user_id, tmdb_movie_id, kind, title, poster_path, created_at)` · function `public.username_available(name text) → boolean` · trigger `on_auth_user_created` อ่าน `raw_user_meta_data.username` และ `.display_name`

- [ ] **Step 1 (ผู้ใช้ทำ): สร้างโปรเจกต์**

1. https://supabase.com → Sign in → **New project** (region: Southeast Asia (Singapore)) ตั้ง database password เก็บไว้
2. **Authentication → Sign In / Providers → Email** ปิด **Confirm email** → Save
3. **Project Settings → API** คัดลอก **Project URL**, **anon public** key และ **service_role** key
4. ใส่ใน `~/Downloads/movie-library/.env` (ไม่ต้องส่งในแชต):
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

- [ ] **Step 2: อัปเดต `.env.example`**

```
# Set either TMDB API Key (v3) or API Read Access Token. Server only.
TMDB_API_KEY=
TMDB_READ_TOKEN=
PORT=3001

# Supabase (Project Settings → API). anon key is safe in the browser; RLS enforces access.
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
# Tests only (creates/deletes throwaway users). Never prefix with VITE_.
SUPABASE_SERVICE_ROLE_KEY=
```

- [ ] **Step 3: เขียน RLS test ก่อนมี schema**

`tests/rls.test.js`
```js
import { describe, test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const anonKey = process.env.VITE_SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const skip =
  !(url && anonKey && serviceKey) &&
  'ยังไม่ได้ตรวจ RLS: ตั้ง VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY ใน .env'
const opts = { auth: { persistSession: false, autoRefreshToken: false } }

describe('Supabase RLS', { skip }, () => {
  const admin = createClient(url, serviceKey, opts)
  const run = Date.now().toString(36)
  const password = 'rls-test-password-123'
  const created = []
  const users = {}
  const anon = () => createClient(url, anonKey, opts)

  async function makeUser(tag) {
    const email = `rls-${tag}-${run}@example.com`
    const username = `rls_${tag}_${run}`
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username, display_name: 'RLS ' + tag },
    })
    assert.ifError(error)
    created.push(data.user.id)
    const client = anon()
    const signIn = await client.auth.signInWithPassword({ email, password })
    assert.ifError(signIn.error)
    return { id: data.user.id, username, client }
  }
  const setPublic = async (value) => {
    const { error } = await users.a.client
      .from('profiles')
      .update({ is_public: value })
      .eq('id', users.a.id)
    assert.ifError(error)
  }
  const itemsOfA = async (client) => {
    const { data, error } = await client
      .from('library_items')
      .select('tmdb_movie_id, kind')
      .eq('user_id', users.a.id)
      .order('tmdb_movie_id')
    assert.ifError(error)
    return data
  }
  const profileOfA = async (client) => {
    const { data, error } = await client
      .from('profiles')
      .select('id, display_name, is_public')
      .eq('username', users.a.username)
    assert.ifError(error)
    return data
  }

  before(async () => {
    users.a = await makeUser('a')
    users.b = await makeUser('b')
    const { error } = await users.a.client.from('library_items').insert([
      {
        user_id: users.a.id,
        tmdb_movie_id: 157336,
        kind: 'liked',
        title: 'Interstellar',
        poster_path: null,
      },
      {
        user_id: users.a.id,
        tmdb_movie_id: 27205,
        kind: 'watchlist',
        title: 'Inception',
        poster_path: null,
      },
    ])
    assert.ifError(error)
  })
  after(async () => {
    for (const id of created) await admin.auth.admin.deleteUser(id)
  })

  test('trigger creates a private profile from signup metadata', async () => {
    const [profile] = await profileOfA(users.a.client)
    assert.equal(profile.display_name, 'RLS a')
    assert.equal(profile.is_public, false)
  })

  test('private: other users and guests see neither profile nor items', async () => {
    await setPublic(false)
    for (const client of [users.b.client, anon()]) {
      assert.deepEqual(await profileOfA(client), [])
      assert.deepEqual(await itemsOfA(client), [])
    }
  })

  test('owner sees own private profile and both kinds', async () => {
    await setPublic(false)
    assert.equal((await profileOfA(users.a.client)).length, 1)
    assert.deepEqual(await itemsOfA(users.a.client), [
      { tmdb_movie_id: 27205, kind: 'watchlist' },
      { tmdb_movie_id: 157336, kind: 'liked' },
    ])
  })

  test('public: others see profile and liked only, never watchlist', async () => {
    await setPublic(true)
    for (const client of [users.b.client, anon()]) {
      assert.equal((await profileOfA(client)).length, 1)
      assert.deepEqual(await itemsOfA(client), [
        { tmdb_movie_id: 157336, kind: 'liked' },
      ])
    }
  })

  test('switching back to private takes effect immediately', async () => {
    await setPublic(true)
    await setPublic(false)
    assert.deepEqual(await itemsOfA(anon()), [])
  })

  test('B cannot insert, delete or update data of A', async () => {
    await setPublic(true)
    const insert = await users.b.client.from('library_items').insert({
      user_id: users.a.id,
      tmdb_movie_id: 1,
      kind: 'liked',
      title: 'Injected',
      poster_path: null,
    })
    assert.equal(insert.error?.code, '42501')
    await users.b.client
      .from('library_items')
      .delete()
      .eq('user_id', users.a.id)
    await users.b.client
      .from('profiles')
      .update({ display_name: 'hacked', is_public: false })
      .eq('id', users.a.id)
    assert.equal((await itemsOfA(users.a.client)).length, 2)
    const [profile] = await profileOfA(users.a.client)
    assert.equal(profile.display_name, 'RLS a')
    assert.equal(profile.is_public, true)
  })

  test('owner cannot change id or created_at of own profile', async () => {
    const { error } = await users.a.client
      .from('profiles')
      .update({ created_at: '2000-01-01T00:00:00Z' })
      .eq('id', users.a.id)
    assert.equal(error?.code, '42501')
  })

  test('username_available reflects taken names, case-insensitively', async () => {
    const taken = await anon().rpc('username_available', {
      name: users.a.username.toUpperCase(),
    })
    assert.ifError(taken.error)
    assert.equal(taken.data, false)
    const free = await anon().rpc('username_available', {
      name: 'free_' + run,
    })
    assert.equal(free.data, true)
  })

  test('signup with a taken username fails with the message we map', async () => {
    const { data, error } = await anon().auth.signUp({
      email: `rls-dup-${run}@example.com`,
      password,
      options: {
        data: { username: users.a.username, display_name: 'dup' },
      },
    })
    if (data?.user) created.push(data.user.id)
    assert.match(error?.message || '', /Database error saving new user/i)
  })
})
```

- [ ] **Step 4: รันให้เห็นแดง (ยังไม่มี schema)**

Run: `node --env-file=.env --test tests/rls.test.js`
Expected: FAIL — `createUser` สำเร็จแต่ `profileOfA` error เพราะไม่มีตาราง `profiles` (หรือ error `relation "public.profiles" does not exist`) · ถ้าเห็น `# SKIP` แปลว่า `.env` ยังไม่ครบ — กลับไป Step 1

- [ ] **Step 5: เขียน `supabase/schema.sql`**

```sql
-- CineShelf schema. Safe to re-run in Supabase SQL Editor.

create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  username     text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null check (char_length(display_name) between 1 and 50),
  avatar_url   text,
  is_public    boolean not null default false,
  created_at   timestamptz not null default now()
);

create table if not exists public.library_items (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  tmdb_movie_id integer not null check (tmdb_movie_id > 0),
  kind          text not null check (kind in ('liked', 'watchlist')),
  title         text not null,
  poster_path   text,
  created_at    timestamptz not null default now(),
  unique (user_id, tmdb_movie_id, kind)
);

create index if not exists library_items_user_kind_idx
  on public.library_items (user_id, kind, created_at desc);

-- Profile row is created by the signup trigger; username/display_name come from signUp options.data.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    lower(new.raw_user_meta_data ->> 'username'),
    coalesce(new.raw_user_meta_data ->> 'display_name',
             new.raw_user_meta_data ->> 'username')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.username_available(name text)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select not exists (
    select 1 from public.profiles where username = lower(trim(name))
  );
$$;
revoke execute on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;

alter table public.profiles      enable row level security;
alter table public.library_items enable row level security;

-- Only these profile columns are editable by their owner.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (username, display_name, avatar_url, is_public)
  on public.profiles to authenticated;
revoke update on public.library_items from anon, authenticated;

drop policy if exists "read public or own profile" on public.profiles;
create policy "read public or own profile" on public.profiles
  for select using (is_public or id = auth.uid());

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "read own or public liked" on public.library_items;
create policy "read own or public liked" on public.library_items
  for select using (
    user_id = auth.uid()
    or (
      kind = 'liked'
      and exists (
        select 1 from public.profiles p
        where p.id = library_items.user_id and p.is_public
      )
    )
  );

drop policy if exists "insert own items" on public.library_items;
create policy "insert own items" on public.library_items
  for insert with check (user_id = auth.uid());

drop policy if exists "delete own items" on public.library_items;
create policy "delete own items" on public.library_items
  for delete using (user_id = auth.uid());
```

- [ ] **Step 6 (ผู้ใช้ทำ): รัน schema**

Supabase Dashboard → **SQL Editor** → New query → วางเนื้อหา `supabase/schema.sql` ทั้งไฟล์ → **Run** · Expected: `Success. No rows returned`

- [ ] **Step 7: รันให้เขียว**

Run: `node --env-file=.env --test tests/rls.test.js`
Expected: PASS 9/9 · ไม่มี user `rls-*` เหลือใน Authentication → Users

- [ ] **Step 8: พิสูจน์ว่าเทสต์จับ policy หลวมได้จริง (ผู้ใช้รันใน SQL Editor)**

```sql
drop policy "read own or public liked" on public.library_items;
create policy "read own or public liked" on public.library_items
  for select using (true);
```
Run: `node --env-file=.env --test tests/rls.test.js`
Expected: FAIL อย่างน้อย `private: ...` และ `public: ... never watchlist`

แล้วคืนค่า: รัน `supabase/schema.sql` ทั้งไฟล์อีกครั้ง (re-run ได้) → รันเทสต์ซ้ำ Expected: PASS 9/9

- [ ] **Step 9: ถามผู้ใช้แล้วค่อย commit**

```bash
git add supabase/schema.sql tests/rls.test.js .env.example
git commit -m "feat(db): add Supabase schema with RLS and RLS integration tests"
```

---

### Task 4: Supabase client, SetupNotice, AuthContext, หน้า Auth

**Files:**
- Create: `src/lib/supabaseConfig.js`, `src/lib/supabase.js`, `src/lib/profiles.js`, `src/components/SetupNotice.jsx`
- Rewrite: `src/context/AuthContext.jsx`
- Modify: `src/pages/Auth.jsx`, `src/main.jsx`
- Test: `tests/supabase-config.test.js`

**Interfaces:**
- Consumes: `toThaiMessage`, `registerSchema`, `loginSchema` (Task 1)
- Produces:
  - `readSupabaseConfig(env): { url: string, anonKey: string } | null` (ใน `src/lib/supabaseConfig.js`)
  - `supabaseConfigured: boolean`, `supabase: SupabaseClient | null`
  - `usernameAvailable(name: string): Promise<boolean>`
  - `fetchProfile(username: string): Promise<{ profile: {id, username, display_name, is_public}, movies: {id,title,poster_path}[] } | null>`
  - `useAuth(): { user, profile, loading, error, signUp(values), signIn(values), signOut(), updateProfile(patch) }` — `user` = `{ id, email }` หรือ `null`

- [ ] **Step 1: เขียนเทสต์ config (ต้องแดง)**

`tests/supabase-config.test.js`
```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readSupabaseConfig } from '../src/lib/supabaseConfig.js'

test('returns null when either variable is missing or blank', () => {
  assert.equal(readSupabaseConfig({}), null)
  assert.equal(
    readSupabaseConfig({ VITE_SUPABASE_URL: 'https://x.supabase.co' }),
    null,
  )
  assert.equal(
    readSupabaseConfig({
      VITE_SUPABASE_URL: ' ',
      VITE_SUPABASE_ANON_KEY: 'k',
    }),
    null,
  )
})

test('returns trimmed values when both are set', () => {
  assert.deepEqual(
    readSupabaseConfig({
      VITE_SUPABASE_URL: ' https://x.supabase.co ',
      VITE_SUPABASE_ANON_KEY: ' key ',
    }),
    { url: 'https://x.supabase.co', anonKey: 'key' },
  )
})
```

> `readSupabaseConfig` อยู่ไฟล์แยก `src/lib/supabaseConfig.js` เพื่อให้ Node test import ได้โดยไม่แตะ `import.meta.env`

- [ ] **Step 2: รันให้เห็นแดง**

Run: `node --test tests/supabase-config.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: เขียน config + client**

`src/lib/supabaseConfig.js`
```js
export function readSupabaseConfig(env) {
  const url = env.VITE_SUPABASE_URL?.trim()
  const anonKey = env.VITE_SUPABASE_ANON_KEY?.trim()
  return url && anonKey ? { url, anonKey } : null
}
```

`src/lib/supabase.js`
```js
import { createClient } from '@supabase/supabase-js'
import { readSupabaseConfig } from './supabaseConfig.js'
const config = readSupabaseConfig(import.meta.env)
export const supabaseConfigured = Boolean(config)
export const supabase = config ? createClient(config.url, config.anonKey) : null
```

- [ ] **Step 4: รันให้เขียว**

Run: `node --test tests/supabase-config.test.js`
Expected: PASS 2/2

- [ ] **Step 5: `src/lib/profiles.js`**

```js
import { supabase } from './supabase'
import { toThaiMessage } from './supabaseErrors'
import { itemToMovie } from './library'
import { normalizeUsername } from '../schemas/auth'

const fail = (error) => {
  throw new Error(toThaiMessage(error))
}

export async function usernameAvailable(name) {
  const { data, error } = await supabase.rpc('username_available', { name })
  if (error) fail(error)
  return data
}

// Returns null for both "no such user" and "private" so the page cannot tell them apart.
export async function fetchProfile(username) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, is_public')
    .eq('username', normalizeUsername(username))
    .maybeSingle()
  if (error) fail(error)
  if (!profile) return null
  const { data: items, error: itemsError } = await supabase
    .from('library_items')
    .select('tmdb_movie_id, title, poster_path, created_at')
    .eq('user_id', profile.id)
    .eq('kind', 'liked')
    .order('created_at', { ascending: false })
  if (itemsError) fail(itemsError)
  return { profile, movies: items.map(itemToMovie) }
}
```

- [ ] **Step 6: `src/components/SetupNotice.jsx`**

```jsx
export default function SetupNotice() {
  return (
    <main className="page setup-notice">
      <h1>ยังไม่ได้ตั้งค่า Supabase</h1>
      <p>
        ใส่ค่าต่อไปนี้ในไฟล์ <code>.env</code> ที่โฟลเดอร์โปรเจกต์ แล้วหยุดและรัน{' '}
        <code>npm run dev</code> ใหม่
      </p>
      <pre>
        VITE_SUPABASE_URL=https://xxxx.supabase.co{'\n'}
        VITE_SUPABASE_ANON_KEY=eyJ...
      </pre>
      <p>ขั้นตอนสร้างโปรเจกต์อยู่ใน README หัวข้อ “ตั้งค่า Supabase”</p>
    </main>
  )
}
```

- [ ] **Step 7: เขียน `src/context/AuthContext.jsx` ใหม่ทั้งไฟล์**

```jsx
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { toThaiMessage } from '../lib/supabaseErrors'
const AuthContext = createContext(null)
const columns = 'id, username, display_name, avatar_url, is_public'
const fail = (error) => {
  throw new Error(toThaiMessage(error))
}
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [ready, setReady] = useState(false)
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState(null)
  const user = session?.user
    ? { id: session.user.id, email: session.user.email }
    : null
  useEffect(() => {
    // INITIAL_SESSION fires first, so this one listener also covers the initial load.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])
  useEffect(() => {
    if (!user) {
      setProfile(null)
      return
    }
    let active = true
    // Supabase calls must not run inside onAuthStateChange, so the profile loads here.
    supabase
      .from('profiles')
      .select(columns)
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (!active) return
        if (error) setError(new Error(toThaiMessage(error)))
        else {
          setProfile(data)
          setError(null)
        }
      })
    return () => {
      active = false
    }
  }, [user?.id])
  async function signUp({ email, password, username, displayName }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username, display_name: displayName } },
    })
    if (error) fail(error)
    if (!data.session)
      throw new Error(
        'สมัครสำเร็จแต่ยังเข้าสู่ระบบไม่ได้ ตรวจว่าปิด Confirm email ใน Supabase แล้ว',
      )
  }
  async function signIn({ email, password }) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) fail(error)
  }
  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) fail(error)
  }
  async function updateProfile(patch) {
    const { data, error } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', user.id)
      .select(columns)
      .single()
    if (error) fail(error)
    setProfile(data)
    return data
  }
  const loading = !ready || Boolean(user && !profile && !error)
  return (
    <AuthContext.Provider
      value={{ user, profile, loading, error, signUp, signIn, signOut, updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  )
}
export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth ต้องอยู่ภายใน AuthProvider')
  return value
}
```

- [ ] **Step 8: แก้ `src/pages/Auth.jsx`**

1. import: เปลี่ยน `const { user, loading, authenticate } = useAuth()` เป็น `const { user, loading, signUp: createAccount, signIn } = useAuth()` และเพิ่ม `import { usernameAvailable } from '../lib/profiles'`
2. แทน `submit`:
```jsx
  async function submit(values) {
    try {
      if (signUp) {
        if (!(await usernameAvailable(values.username)))
          return setError('username', { message: 'ชื่อผู้ใช้นี้ถูกใช้แล้ว' })
        await createAccount(values)
      } else await signIn(values)
    } catch (error) {
      setError('root', { message: error.message })
    }
  }
```
3. แทนฟิลด์ `name` ในอาร์เรย์ `fields` ด้วยสองฟิลด์:
```jsx
          {
            name: 'displayName',
            label: 'ชื่อที่แสดง',
            type: 'text',
            auto: 'nickname',
            placeholder: 'ชื่อของคุณ',
          },
          {
            name: 'username',
            label: 'ชื่อผู้ใช้ (ใช้ในลิงก์โปรไฟล์)',
            type: 'text',
            auto: 'username',
            placeholder: 'เช่น por_01',
          },
```
4. แทน `maxLength={...}` ด้วย:
```jsx
                maxLength={
                  { displayName: 50, username: 20, email: 254 }[field.name] ||
                  128
                }
```
5. ลบ default redirect `/library` คงไว้ตามเดิม (ยังใช้ได้)

- [ ] **Step 9: แก้ `src/main.jsx`**

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LibraryProvider } from './context/LibraryContext'
import { supabaseConfigured } from './lib/supabase'
import SetupNotice from './components/SetupNotice'
import App from './App'
import './index.css'
function LibraryRoot() {
  const { user } = useAuth()
  // Keyed by account so switching users never shows the previous account's items.
  return (
    <LibraryProvider key={user?.id || 'guest'}>
      <App />
    </LibraryProvider>
  )
}
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {supabaseConfigured ? (
      <BrowserRouter>
        <AuthProvider>
          <LibraryRoot />
        </AuthProvider>
      </BrowserRouter>
    ) : (
      <SetupNotice />
    )}
  </React.StrictMode>,
)
```

> Task นี้ยัง build ไม่ผ่าน เพราะ `LibraryContext`/`Layout`/`Library` ยังเรียก API เก่า (`authenticate`, `logout`, `share`, `user.name`) — Task 5 แก้ ไม่ต้อง commit แยกถ้า build พัง ให้รวม commit กับ Task 5

- [ ] **Step 10: รัน unit tests ทั้งหมด**

Run: `npm test 2>&1 | tail -8`
Expected: unit tests PASS · RLS PASS หรือ SKIP (พร้อมเหตุผล)

---

### Task 5: LibraryContext, ปุ่ม ♥/🔖, Layout, หน้า Library, MovieDetail

**Files:**
- Rewrite: `src/context/LibraryContext.jsx`, `src/pages/Library.jsx`
- Create: `src/components/LibraryButtons.jsx`
- Modify: `src/components/Icon.jsx`, `src/components/MovieCard.jsx`, `src/components/Layout.jsx`, `src/pages/MovieDetail.jsx`, `src/index.css`
- Delete: `src/components/PersonalMovieEditor.jsx`, `src/storage/portfolio.ts`

**Interfaces:**
- Consumes: `useAuth()` (Task 4), `idsOf/applyToggle/revertToggle/itemToMovie` (Task 1), `supabase`, `toThaiMessage`
- Produces: `useLibrary(): { items, likedIds: Set<number>, watchlistIds: Set<number>, loading, error, retry(), has(id, kind), isPending(id, kind), toggle(movie, kind): Promise<void> }` · `<LibraryButtons movie compact? />`

- [ ] **Step 1: เขียน `src/context/LibraryContext.jsx` ใหม่ทั้งไฟล์**

```jsx
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from './AuthContext'
import { supabase } from '../lib/supabase'
import { toThaiMessage } from '../lib/supabaseErrors'
import { applyToggle, idsOf, revertToggle } from '../lib/library'
const LibraryContext = createContext(null)
export function LibraryProvider({ children }) {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const latest = useRef(items)
  const [loading, setLoading] = useState(Boolean(user))
  const [error, setError] = useState(null)
  const [pending, setPending] = useState(() => new Set())
  const [attempt, setAttempt] = useState(0)
  function commit(next) {
    latest.current = next
    setItems(next)
  }
  useEffect(() => {
    if (!user) return setLoading(false)
    let active = true
    setLoading(true)
    supabase
      .from('library_items')
      .select('tmdb_movie_id, kind, title, poster_path, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!active) return
        if (error) setError(new Error(toThaiMessage(error)))
        else {
          commit(data)
          setError(null)
        }
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [user?.id, attempt])
  const likedIds = useMemo(() => idsOf(items, 'liked'), [items])
  const watchlistIds = useMemo(() => idsOf(items, 'watchlist'), [items])
  const key = (id, kind) => kind + ':' + id
  async function toggle(movie, kind) {
    if (!user) throw new Error('กรุณาเข้าสู่ระบบก่อน')
    const k = key(movie.id, kind)
    if (pending.has(k)) return
    setPending((old) => new Set(old).add(k))
    const result = applyToggle(latest.current, movie, kind, user.id)
    commit(result.items)
    const table = supabase.from('library_items')
    const { error } =
      result.action === 'insert'
        ? await table.upsert(result.row, {
            onConflict: 'user_id,tmdb_movie_id,kind',
            ignoreDuplicates: true,
          })
        : await table.delete().match(result.row)
    setPending((old) => {
      const next = new Set(old)
      next.delete(k)
      return next
    })
    if (error) {
      commit(revertToggle(latest.current, result))
      throw new Error(toThaiMessage(error))
    }
  }
  return (
    <LibraryContext.Provider
      value={{
        items,
        likedIds,
        watchlistIds,
        loading,
        error,
        retry: () => setAttempt((v) => v + 1),
        has: (id, kind) => (kind === 'liked' ? likedIds : watchlistIds).has(id),
        isPending: (id, kind) => pending.has(key(id, kind)),
        toggle,
      }}
    >
      {children}
    </LibraryContext.Provider>
  )
}
export function useLibrary() {
  const value = useContext(LibraryContext)
  if (!value) throw new Error('useLibrary ต้องอยู่ภายใน LibraryProvider')
  return value
}
```

- [ ] **Step 2: เพิ่มไอคอนใน `src/components/Icon.jsx`** (ต่อจาก `check:`)

```jsx
  heart: (
    <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />
  ),
  bookmark: <path d="M6 3h12v18l-6-4-6 4Z" />,
```

- [ ] **Step 3: `src/components/LibraryButtons.jsx`**

```jsx
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLibrary } from '../context/LibraryContext'
import Icon from './Icon'
const kinds = [
  { kind: 'liked', icon: 'heart', on: 'เลิกถูกใจ', off: 'ถูกใจ', label: 'ถูกใจแล้ว' },
  { kind: 'watchlist', icon: 'bookmark', on: 'นำออกจากอยากดู', off: 'เพิ่มในอยากดู', label: 'อยู่ในอยากดู' },
]
export default function LibraryButtons({ movie, compact = false }) {
  const { user } = useAuth()
  const { has, isPending, toggle, loading } = useLibrary()
  const location = useLocation()
  const [error, setError] = useState('')
  const cls = (active) =>
    compact
      ? 'save-icon' + (active ? ' saved' : '')
      : 'button ' + (active ? 'secondary' : 'primary')
  if (!user)
    return (
      <div className={compact ? 'save-wrap compact' : 'save-wrap'}>
        {kinds.map(({ kind, icon, off }) => (
          <Link
            key={kind}
            className={cls(false)}
            to={'/login?next=' + encodeURIComponent(location.pathname)}
            aria-label={off + ': ' + movie.title + ' (ต้องเข้าสู่ระบบ)'}
          >
            <Icon name={icon} />
            {!compact && off}
          </Link>
        ))}
      </div>
    )
  async function press(kind) {
    setError('')
    try {
      await toggle(movie, kind)
    } catch (err) {
      setError(err.message)
    }
  }
  return (
    <div className={compact ? 'save-wrap compact' : 'save-wrap'}>
      {kinds.map(({ kind, icon, on, off, label }) => {
        const active = has(movie.id, kind)
        return (
          <button
            key={kind}
            className={cls(active)}
            aria-label={(active ? on : off) + ': ' + movie.title}
            aria-pressed={active}
            disabled={loading || isPending(movie.id, kind)}
            onClick={() => press(kind)}
          >
            <Icon name={icon} />
            {!compact && (active ? label : off)}
          </button>
        )
      })}
      {error && (
        <small className="field-error" role="alert">
          {error}
        </small>
      )}
    </div>
  )
}
```

- [ ] **Step 4: แก้ `src/components/MovieCard.jsx`**

ลบฟังก์ชัน `SaveButton` ทั้งก้อนและ import `useLibrary` · เพิ่ม `import LibraryButtons from './LibraryButtons'` · แทน `{!readOnly && <SaveButton movie={movie} compact />}` ด้วย `{!readOnly && <LibraryButtons movie={movie} compact />}` · ห่อป้ายคะแนนและปีด้วยเงื่อนไข (แถวจาก `library_items` ไม่มีสองค่านี้):
```jsx
        {movie.vote_average != null && (
          <span className="rating">
            <Icon name="star" size={12} />
            {Number(movie.vote_average).toFixed(1)}
          </span>
        )}
```
```jsx
      {movie.release_date !== undefined && (
        <p className="movie-meta">
          {year(movie)}
          <span>ภาพยนตร์</span>
        </p>
      )}
```

- [ ] **Step 5: แก้ `src/pages/MovieDetail.jsx`**

ลบ `import PersonalMovieEditor ...`, `import { SaveButton } ...` และ `<PersonalMovieEditor movieId={movie.id} />` · เพิ่ม `import LibraryButtons from '../components/LibraryButtons'` · แทน `<SaveButton movie={movie} />` ด้วย `<LibraryButtons movie={movie} />`

- [ ] **Step 6: แก้ `src/components/Layout.jsx`**

1. `const { user, profile, signOut: endSession, loading, error } = useAuth()` และ `const { likedIds } = useLibrary()`
2. ใน `signOut()` เปลี่ยน `await logout()` เป็น `await endSession()`
3. ตัวนับ: `ห้องสมุดของฉัน <span className="count">{likedIds.size}</span>`
4. เปลี่ยนเงื่อนไข `) : user ? (` เป็น `) : user && profile ? (` (โปรไฟล์โหลดพลาด → แถบ error ด้านล่างแสดงแทน ไม่ crash) แล้วแทนเนื้อในก้อนนั้นด้วย:
```jsx
              <>
                <Link
                  className="avatar"
                  to={'/u/' + profile.username}
                  title={'โปรไฟล์ของ ' + profile.display_name}
                >
                  {profile.display_name.slice(0, 1)}
                </Link>
                <Link className="text-button" to="/settings/profile">
                  ตั้งค่าโปรไฟล์
                </Link>
                <button
                  className="text-button"
                  disabled={loggingOut}
                  onClick={signOut}
                >
                  ออกจากระบบ
                </button>
              </>
```
5. แถบ error: แทน `{logoutError || error.message}{' '}{error && <button onClick={retry}>ลองเชื่อมต่อใหม่</button>}` ด้วย `{logoutError || error.message}` (AuthContext ไม่มี `retry`)

- [ ] **Step 7: เขียน `src/pages/Library.jsx` ใหม่ทั้งไฟล์**

```jsx
import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLibrary } from '../context/LibraryContext'
import { itemToMovie } from '../lib/library'
import MovieCard from '../components/MovieCard'
import { Empty, ErrorState, Loading } from '../components/States'
import Icon from '../components/Icon'
const tabs = [
  ['liked', 'ถูกใจ'],
  ['watchlist', 'อยากดู'],
]
export default function Library() {
  const { user, profile, loading: authLoading } = useAuth()
  const { items, loading, error, retry } = useLibrary()
  const [tab, setTab] = useState('liked')
  const [query, setQuery] = useState('')
  if (authLoading) return <Loading />
  if (!user) return <Navigate to="/login?next=/library" replace />
  if (!profile) return <ErrorState error={new Error('โหลดโปรไฟล์ไม่ได้ กรุณารีเฟรช')} />
  const inTab = items.filter((i) => i.kind === tab)
  const visible = inTab
    .filter((i) => i.title.toLowerCase().includes(query.trim().toLowerCase()))
    .map(itemToMovie)
  return (
    <div className="page inner-page">
      <div className="library-heading">
        <div className="page-heading">
          <span className="eyebrow">@{profile.username}</span>
          <h1>
            ห้องสมุดของฉัน<span className="accent">.</span>
          </h1>
          <p>
            เพื่อนเห็นเฉพาะแท็บ “ถูกใจ” เมื่อโปรไฟล์เป็นสาธารณะ ·{' '}
            <Link className="text-link" to="/settings/profile">
              {profile.is_public ? 'สาธารณะ' : 'ส่วนตัว'} — ตั้งค่าการแชร์
            </Link>
          </p>
        </div>
      </div>
      <div className="section-heading library-toolbar">
        <div className="genre-row" role="tablist" aria-label="แท็บห้องสมุด">
          {tabs.map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              className={tab === id ? 'chip selected' : 'chip'}
              onClick={() => setTab(id)}
            >
              {label} ({items.filter((i) => i.kind === id).length})
            </button>
          ))}
        </div>
        <label className="library-search">
          <Icon name="search" />
          <input
            aria-label="ค้นหาในห้องสมุด"
            placeholder="ค้นหาบนชั้นของคุณ…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      {loading ? (
        <Loading cards />
      ) : error ? (
        <ErrorState error={error} retry={retry} />
      ) : !inTab.length ? (
        <Empty
          text={
            tab === 'liked'
              ? 'กด ♥ ที่หนังเรื่องไหนก็ได้ แล้วจะมาอยู่ที่นี่'
              : 'กด 🔖 เพื่อเก็บเรื่องที่อยากดูไว้ก่อน'
          }
        />
      ) : !visible.length ? (
        <Empty title="ไม่พบหนังบนชั้นนี้" text="ลองเปลี่ยนคำค้นดูอีกครั้ง" link={false} />
      ) : (
        <div className="movie-grid">
          {visible.map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 8: CSS ปุ่มคู่ — แก้ `src/index.css` ที่ `.save-wrap.compact`**

```css
.save-wrap.compact {
  position: absolute;
  right: 9px;
  bottom: 9px;
  display: flex;
  gap: 6px;
}
.save-wrap:not(.compact) {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
```

- [ ] **Step 9: ลบไฟล์ที่ไม่ใช้แล้ว + ตรวจว่าไม่มีใครอ้างถึง**

```bash
rm src/components/PersonalMovieEditor.jsx src/storage/portfolio.ts
grep -rn "PersonalMovieEditor\|storage/portfolio\|SaveButton\|authenticate\|\.share(\|shareToken\|user\.name" src || echo "no references"
```
Expected: `no references`

- [ ] **Step 10: build + test**

Run: `npm run build 2>&1 | tail -5 && npm test 2>&1 | tail -8`
Expected: build สำเร็จ (ยกเว้น `Shared.jsx` ที่ยังอยู่ใน `App.jsx` — ถ้า build พังเพราะไฟล์นั้น ให้ทำ Task 6 Step 4 ก่อน) · tests PASS/SKIP

- [ ] **Step 11: ทดสอบมือ (ต้องมี `.env` ครบ)**

Run: `npm run dev` → http://localhost:5175
- สมัครด้วย username ใหม่ → เข้าหน้า `/library` ได้ทันที
- กด ♥ ที่การ์ดหน้าแรก → ตัวนับเมนูเพิ่ม → รีเฟรช → ยังอยู่
- กด 🔖 → แท็บ "อยากดู" มี · แท็บ "ถูกใจ" ไม่มี (ถ้าไม่ได้กด ♥)
- ปิด Wi-Fi แล้วกด ♥ → ปุ่มเด้งกลับ + ข้อความ "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้..."

- [ ] **Step 12: ถามผู้ใช้แล้วค่อย commit (รวม Task 4)**

```bash
git add -A src tests/supabase-config.test.js
git commit -m "feat(auth,library): Supabase auth and liked/watchlist library with global context"
```

---

### Task 6: หน้าตั้งค่าโปรไฟล์ + หน้าโปรไฟล์ที่แชร์ + routes

**Files:**
- Create: `src/pages/ProfileSettings.jsx`, `src/pages/Profile.jsx`
- Modify: `src/App.jsx`, `src/index.css`
- Delete: `src/pages/Shared.jsx`

**Interfaces:**
- Consumes: `useAuth().{user, profile, loading, updateProfile}`, `usernameAvailable`, `fetchProfile` (Task 4), `profileSchema` (Task 1), `MovieCard` `readOnly`

- [ ] **Step 1: `src/pages/ProfileSettings.jsx`**

```jsx
import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '../context/AuthContext'
import { usernameAvailable } from '../lib/profiles'
import { profileSchema } from '../schemas/auth'
import { ErrorState, Loading } from '../components/States'
export default function ProfileSettings() {
  const { user, profile, loading, updateProfile } = useAuth()
  const [message, setMessage] = useState('')
  const [toggling, setToggling] = useState(false)
  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(profileSchema),
    mode: 'onTouched',
    values: profile
      ? { username: profile.username, displayName: profile.display_name }
      : undefined,
  })
  if (loading) return <Loading />
  if (!user) return <Navigate to="/login?next=/settings/profile" replace />
  if (!profile) return <ErrorState error={new Error('โหลดโปรไฟล์ไม่ได้ กรุณารีเฟรช')} />
  const link = window.location.origin + '/u/' + profile.username
  const renaming = (watch('username') || '').trim().toLowerCase() !== profile.username
  async function save(values) {
    setMessage('')
    try {
      if (values.username !== profile.username && !(await usernameAvailable(values.username)))
        return setError('username', { message: 'ชื่อผู้ใช้นี้ถูกใช้แล้ว' })
      await updateProfile({ username: values.username, display_name: values.displayName })
      setMessage('บันทึกแล้ว')
    } catch (error) {
      setError('root', { message: error.message })
    }
  }
  async function togglePublic() {
    setToggling(true)
    setMessage('')
    try {
      await updateProfile({ is_public: !profile.is_public })
    } catch (error) {
      setMessage(error.message)
    } finally {
      setToggling(false)
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(link)
      setMessage('คัดลอกลิงก์แล้ว ส่งให้เพื่อนได้เลย')
    } catch {
      setMessage('คัดลอกอัตโนมัติไม่ได้ กรุณาเลือกลิงก์แล้วคัดลอกเอง')
    }
  }
  return (
    <div className="page inner-page settings-page">
      <div className="page-heading">
        <span className="eyebrow">PROFILE</span>
        <h1>
          ตั้งค่าโปรไฟล์<span className="accent">.</span>
        </h1>
      </div>
      <section className="share-panel">
        <h2>{profile.is_public ? 'โปรไฟล์สาธารณะ' : 'โปรไฟล์ส่วนตัว'}</h2>
        <p>
          {profile.is_public
            ? 'ใครมีลิงก์ก็เห็นหนังที่คุณกดถูกใจ โดยไม่ต้องเข้าสู่ระบบ (ไม่เห็นรายการอยากดูและอีเมล)'
            : 'มีแค่คุณที่เห็นโปรไฟล์นี้ คนอื่นเปิดลิงก์จะไม่เห็นอะไร'}
        </p>
        <div className="share-actions">
          <button
            className="button secondary small"
            role="switch"
            aria-checked={profile.is_public}
            onClick={togglePublic}
            disabled={toggling}
          >
            {toggling ? 'กำลังบันทึก…' : profile.is_public ? 'เปลี่ยนเป็นส่วนตัว' : 'เปิดเป็นสาธารณะ'}
          </button>
          <button className="button primary small" onClick={copy}>
            คัดลอกลิงก์
          </button>
        </div>
        <div className="share-link-row">
          <input aria-label="ลิงก์โปรไฟล์" value={link} readOnly onFocus={(e) => e.target.select()} />
          <Link className="text-link" to={'/u/' + profile.username}>
            ดูหน้าโปรไฟล์ ↗
          </Link>
        </div>
        {message && (
          <p className="share-message" role="status">
            {message}
          </p>
        )}
      </section>
      <form onSubmit={handleSubmit(save)} noValidate className="settings-form">
        {[
          ['displayName', 'ชื่อที่แสดง', 50],
          ['username', 'ชื่อผู้ใช้ (ใช้ในลิงก์โปรไฟล์)', 20],
        ].map(([name, label, max]) => (
          <div className="form-field" key={name}>
            <label htmlFor={name}>{label}</label>
            <input
              id={name}
              maxLength={max}
              aria-invalid={Boolean(errors[name])}
              aria-describedby={errors[name] ? name + '-error' : undefined}
              {...register(name)}
            />
            {errors[name] && (
              <span id={name + '-error'} className="field-error">
                {errors[name].message}
              </span>
            )}
          </div>
        ))}
        {renaming && (
          <p className="notice" role="status">
            เปลี่ยนชื่อผู้ใช้แล้ว ลิงก์เก่าที่เคยแชร์ไปจะใช้ไม่ได้
          </p>
        )}
        {errors.root && (
          <p className="notice error" role="alert">
            {errors.root.message}
          </p>
        )}
        <button className="button primary" disabled={isSubmitting}>
          {isSubmitting ? 'กำลังบันทึก…' : 'บันทึก'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: `src/pages/Profile.jsx`**

```jsx
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchProfile } from '../lib/profiles'
import MovieCard from '../components/MovieCard'
import { Empty, ErrorState, Loading } from '../components/States'
import Icon from '../components/Icon'
export default function Profile() {
  const { username } = useParams()
  const { user } = useAuth()
  const [state, setState] = useState({ loading: true })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    setState({ loading: true })
    fetchProfile(username)
      .then((data) => active && setState({ data }))
      .catch((error) => active && setState({ error }))
    return () => {
      active = false
    }
  }, [username, user?.id, attempt])
  if (state.loading) return <Loading />
  if (state.error)
    return (
      <div className="page">
        <ErrorState error={state.error} retry={() => setAttempt((v) => v + 1)} />
      </div>
    )
  if (!state.data)
    return (
      <div className="page">
        <Empty title="ไม่พบโปรไฟล์ หรือโปรไฟล์นี้เป็นส่วนตัว" text="ตรวจลิงก์อีกครั้ง หรือขอให้เจ้าของเปิดเป็นสาธารณะ" link={false} />
      </div>
    )
  const { profile, movies } = state.data
  const own = user?.id === profile.id
  return (
    <div className="page inner-page">
      <div className="shared-label">
        <Icon name="share" size={16} />{' '}
        {own && !profile.is_public ? 'ส่วนตัว — มีแค่คุณที่เห็น' : 'SHARED PROFILE'}
      </div>
      <div className="page-heading">
        <span className="eyebrow">@{profile.username}</span>
        <h1>
          หนังที่ {profile.display_name} ถูกใจ<span className="accent">.</span>
        </h1>
        <p>{movies.length} เรื่อง · ดูได้อย่างเดียว</p>
      </div>
      {movies.length ? (
        <div className="movie-grid">
          {movies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} readOnly />
          ))}
        </div>
      ) : (
        <Empty title="ยังไม่มีหนังที่ถูกใจ" text="กลับมาดูใหม่ภายหลัง" link={false} />
      )}
    </div>
  )
}
```

- [ ] **Step 3: CSS เพิ่มท้าย `src/index.css`**

```css
.settings-form {
  display: grid;
  gap: 16px;
  max-width: 480px;
  margin-top: 32px;
}
.setup-notice pre {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
```

- [ ] **Step 4: แก้ `src/App.jsx` + ลบ `Shared.jsx`**

แทน `import Shared from './pages/Shared'` ด้วย:
```jsx
import Profile from './pages/Profile'
import ProfileSettings from './pages/ProfileSettings'
```
แทน `<Route path="s/:token" element={<Shared />} />` ด้วย:
```jsx
        <Route path="settings/profile" element={<ProfileSettings />} />
        <Route path="u/:username" element={<Profile />} />
```
Run: `rm src/pages/Shared.jsx && grep -rn "Shared\b\|/s/" src || echo "no references"`
Expected: `no references`

- [ ] **Step 5: build + test**

Run: `npm run build 2>&1 | tail -5 && npm test 2>&1 | tail -8`
Expected: build สำเร็จ · tests PASS/SKIP

- [ ] **Step 6: ทดสอบมือ**

`npm run dev`:
- `/settings/profile` → ปุ่ม "เปิดเป็นสาธารณะ" → คัดลอกลิงก์ → เปิดใน Incognito → เห็นหนังที่ ♥ ไม่เห็นที่ 🔖
- กด "เปลี่ยนเป็นส่วนตัว" → รีเฟรช Incognito → "ไม่พบโปรไฟล์ หรือโปรไฟล์นี้เป็นส่วนตัว"
- เจ้าของเปิดลิงก์ตัวเองตอนส่วนตัว → เห็นรายการ + ป้าย "ส่วนตัว — มีแค่คุณที่เห็น"
- เปิด `/u/` + username ตัวพิมพ์ใหญ่ → เจอโปรไฟล์เดียวกัน
- แก้ username เป็นชื่อที่บัญชีอื่นใช้ → "ชื่อผู้ใช้นี้ถูกใช้แล้ว"

- [ ] **Step 7: ถามผู้ใช้แล้วค่อย commit**

```bash
git add -A src
git commit -m "feat(profile): public/private profile sharing at /u/:username"
```

---

### Task 7: เอกสาร — README + Proposal

**Files:** Modify `README.md`, `PROPOSAL-BASIC.md`

- [ ] **Step 1: README — แทนข้อความ SQLite/แชร์เดิม**

1. ส่วน "เริ่มรัน": แทนย่อหน้า "ข้อมูลบัญชีและห้องสมุดอยู่ใน `data/cineshelf.sqlite`..." ด้วย "บัญชี โปรไฟล์ และห้องสมุดเก็บใน Supabase ต้องตั้งค่าตามหัวข้อ “ตั้งค่า Supabase” ก่อน ถ้ายังไม่ตั้ง แอปจะแสดงวิธีตั้งค่าแทน"
2. เพิ่มหัวข้อ `## ตั้งค่า Supabase` ก่อน "เชื่อมข้อมูลหนังจริงจาก TMDB" — คัดลอก 4 ขั้นจาก Task 3 Step 1 + "SQL Editor → วาง `supabase/schema.sql` → Run (รันซ้ำได้)"
3. แทนหัวข้อ `## วิธีแชร์ให้เพื่อน` ทั้งหัวข้อด้วย: สมัคร → กด ♥ → **ตั้งค่าโปรไฟล์ → เปิดเป็นสาธารณะ → คัดลอกลิงก์** → เพื่อนเห็นเฉพาะหนังที่ถูกใจ ไม่เห็นอยากดู/อีเมล → เปลี่ยนเป็นส่วนตัวแล้วลิงก์ใช้ไม่ได้ทันที · คงย่อหน้า localhost/Wi-Fi ไว้ · ลบประโยค persistent disk/SQLite และ env `DATABASE_PATH`, `COOKIE_SECURE`
4. ตารางโครงสร้าง: `server/index.js — Node HTTP server, TMDB proxy, เสิร์ฟ dist` · เพิ่ม `supabase/schema.sql` และ `src/lib/` · `pages` เปลี่ยน `Shared` เป็น `Profile, ProfileSettings`
5. ตาราง "แนวคิด" แถวสุดท้าย: `Supabase (Postgres + RLS) แทน localStorage เพื่อรองรับหลายบัญชีและการแชร์ข้ามเครื่อง`
6. "State อยู่ที่ไหน": แทน bullet ที่ 2–3 ด้วยคำอธิบาย `AuthContext` (session/profile) และ `LibraryContext` (items → likedIds/watchlistIds derive, optimistic toggle + rollback) ตาม Spec ข้อ 5
7. ลบหัวข้อ "ส่วนที่เพิ่มจากพื้นฐานงานเดิม" ย่อหน้าแรก (scrypt/session cookie) แทนด้วย "ใช้ Supabase Auth จัดการรหัสผ่านและ session สิทธิ์ข้อมูลบังคับด้วย Row Level Security ดู `supabase/schema.sql`"
8. "ตรวจสอบ": เพิ่ม "`tests/rls.test.js` รันกับ Supabase จริงเมื่อมี `.env` ครบ ถ้าไม่มีจะแสดง SKIP (ไม่ได้แปลว่าผ่าน)"

- [ ] **Step 2: PROPOSAL-BASIC.md**

1. ข้อ 4 หัวข้อ "Supabase Schema": แทนบล็อก SQL ด้วยประโยค "SQL ฉบับเต็มอยู่ที่ `supabase/schema.sql`" แล้วตามด้วยตารางสรุป 2 ตาราง + RLS 3 ข้อ (คัดจาก Spec ข้อ 4) + บรรทัด "`username_available(name)` ให้ฟอร์มเช็คชื่อซ้ำก่อนส่ง"
2. ข้อ 3 แถว "อ่าน–เขียนห้องสมุดและโปรไฟล์": ไม่ต้องแก้

- [ ] **Step 3: ตรวจไม่มีคำค้าง**

Run: `grep -n "SQLite\|/s/\|scrypt\|localStorage\|เพลย์ลิสต์" README.md PROPOSAL-BASIC.md`
Expected: ไม่พบ หรือพบเฉพาะบริบทที่อธิบายว่า "แทน localStorage"

- [ ] **Step 4: ถามผู้ใช้แล้วค่อย commit**

```bash
git add README.md PROPOSAL-BASIC.md
git commit -m "docs: document Supabase setup and profile sharing"
```

---

### Task 8: Browser test (Playwright, ต้องมี Supabase จริง)

**Files:** Modify `tests/browser.mjs`

**Interfaces:** Consumes `createApp({ movieService })` (Task 2) · env `VITE_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`

- [ ] **Step 1: อ่านผล baseline จาก Task 0 Step 3**

ถ้า browser test เดิมพังอยู่ก่อนแล้วในส่วน TMDB/search (ไม่เกี่ยวกับบัญชี) ไม่ต้องแก้ส่วนนั้น — รายงานผู้ใช้ และใส่ step ใหม่ของเราไว้หลังส่วนที่ผ่าน

- [ ] **Step 2: แก้ส่วนเริ่มต้น**

แทน:
```js
const backend = createApp({
  databasePath: ':memory:',
  movieService: createMovieService(''),
})
```
ด้วย:
```js
import { createClient } from '@supabase/supabase-js'
for (const name of ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'])
  if (!process.env[name]) {
    console.log(`SKIP browser test: ${name} is not set (nothing was checked)`)
    process.exit(0)
  }
const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const run = Date.now().toString(36)
const createdEmails = [`browser-${run}@example.com`]
const backend = createApp({ movieService: createMovieService('') })
```
(ย้าย `import` ไปไว้บนสุดของไฟล์)

- [ ] **Step 3: แทนบล็อกตั้งแต่ `await page.getByRole('button', { name: 'เพิ่มเข้าห้องสมุด: Inception'` จนถึงก่อน `for (const width of [390, 768, 1440])`**

ลบทุก step ที่ใช้ `สถานะ`, `คะแนนของฉัน`, `เรื่องโปรด`, `วันที่ดู`, `รีวิวของฉัน`, `เพลย์ลิสต์`, `บันทึกส่วนตัว`, `localStorage cineshelf:portfolio`, offline edit, `เปิดแชร์ห้องสมุด`, `ปิดการแชร์` และ `addInitScript` legacy-test-key (ต้นไฟล์) · คงส่วน detail 157336 (overview/backdrop/poster) · แล้วใส่:
```js
  // Guest: buttons lead to login
  await page.goto(origin + '/movies/27205')
  await page.getByRole('link', { name: 'ถูกใจ: Inception (ต้องเข้าสู่ระบบ)' }).click()
  await page.waitForURL('**/login?next=%2Fmovies%2F27205')
  // Register
  await page.goto(origin + '/register?next=/movies/157336')
  await page.getByLabel('ชื่อที่แสดง', { exact: true }).fill('Cinema Friend')
  await page.getByLabel('ชื่อผู้ใช้ (ใช้ในลิงก์โปรไฟล์)').fill('Browser_' + run)
  await page.getByLabel('อีเมล', { exact: true }).fill(createdEmails[0])
  await page.getByLabel('รหัสผ่าน', { exact: true }).fill('screen-test-123')
  await page.getByLabel('ยืนยันรหัสผ่าน', { exact: true }).fill('wrong')
  await page.getByRole('button', { name: 'สร้างบัญชีของฉัน', exact: true }).click()
  await page.getByText('รหัสผ่านไม่ตรงกัน', { exact: true }).waitFor()
  await page.getByLabel('ยืนยันรหัสผ่าน', { exact: true }).fill('screen-test-123')
  await page.getByRole('button', { name: 'สร้างบัญชีของฉัน', exact: true }).click()
  await page.waitForURL('**/movies/157336')
  // Like Interstellar, watchlist Inception
  await page.getByRole('button', { name: 'ถูกใจ: Interstellar', exact: true }).click()
  await page.getByRole('button', { name: 'เลิกถูกใจ: Interstellar', exact: true }).waitFor()
  await page.goto(origin + '/movies/27205')
  await page.getByRole('button', { name: 'เพิ่มในอยากดู: Inception', exact: true }).click()
  await page.getByRole('button', { name: 'นำออกจากอยากดู: Inception', exact: true }).waitFor()
  // Persisted in Supabase
  await page.goto(origin + '/library')
  await page.reload()
  await page.getByRole('link', { name: 'ดูรายละเอียด Interstellar', exact: true }).waitFor()
  await page.getByRole('tab', { name: /อยากดู/ }).click()
  await page.getByRole('link', { name: 'ดูรายละเอียด Inception', exact: true }).waitFor()
  // Owner sees own private profile
  const profilePath = '/u/browser_' + run
  await page.goto(origin + profilePath)
  await page.getByText('ส่วนตัว — มีแค่คุณที่เห็น').waitFor()
  // Guest cannot see private profile
  const guest = await browser.newContext()
  await intercept(guest)
  const friend = await guest.newPage()
  await friend.goto(origin + profilePath)
  await friend.getByRole('heading', { name: 'ไม่พบโปรไฟล์ หรือโปรไฟล์นี้เป็นส่วนตัว' }).waitFor()
  // Make public → guest sees liked only, read-only, via uppercase URL
  await page.goto(origin + '/settings/profile')
  await page.getByRole('switch').click()
  await page.getByRole('button', { name: 'เปลี่ยนเป็นส่วนตัว' }).waitFor()
  await friend.goto(origin + profilePath.toUpperCase().replace('/U/', '/u/'))
  await friend.getByRole('heading', { name: 'หนังที่ Cinema Friend ถูกใจ.' }).waitFor()
  assert.equal(await friend.locator('.movie-card').count(), 1)
  assert.equal(await friend.getByText('Inception', { exact: true }).count(), 0)
  assert.equal(await friend.locator('.save-icon').count(), 0)
  // Back to private → guest loses access immediately
  await page.getByRole('switch').click()
  await page.getByRole('button', { name: 'เปิดเป็นสาธารณะ' }).waitFor()
  await friend.reload()
  await friend.getByRole('heading', { name: 'ไม่พบโปรไฟล์ หรือโปรไฟล์นี้เป็นส่วนตัว' }).waitFor()
  await guest.close()
  // Unlike from library
  await page.goto(origin + '/library')
  await page.getByRole('button', { name: 'เลิกถูกใจ: Interstellar', exact: true }).click()
  await page.getByRole('heading', { name: 'ยังไม่มีหนังบนชั้นนี้', exact: true }).waitFor()
  await page.reload()
  await page.getByRole('heading', { name: 'ยังไม่มีหนังบนชั้นนี้', exact: true }).waitFor()
  // Logout clears library
  await page.getByRole('button', { name: 'ออกจากระบบ', exact: true }).click()
  await page.waitForURL(origin + '/')
  await page.goto(origin + '/library')
  await page.waitForURL('**/login?next=%2Flibrary')
```

- [ ] **Step 4: ลบ user ทดสอบใน `finally` + แก้ข้อความสรุป**

ใน `finally` ก่อน `await browser.close()`:
```js
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 })
  for (const u of data?.users || [])
    if (createdEmails.includes(u.email)) await admin.auth.admin.deleteUser(u.id)
```
แทนข้อความ `console.log('Browser checks passed ...')` ด้วย:
```js
  console.log(
    'Browser checks passed (mocked TMDB, real Supabase): collections/retry, search, detail, guest→login, register validation, like/watchlist persist, owner private view, guest private/public/liked-only/uppercase URL, revoke, unlike, logout, 390/768/1440 layouts, no page errors.',
  )
```
และใน loop layout ลบ `'/library'` ออกจากรายการ path (ตอนนี้ redirect ไป login) เพิ่ม `'/login'`

- [ ] **Step 5: รัน**

Run: `npm run build && node --env-file=.env tests/browser.mjs`
Expected: `Browser checks passed (...)` · ไม่มี user `browser-*` ค้างใน Supabase

- [ ] **Step 6: ถามผู้ใช้แล้วค่อย commit**

```bash
git add tests/browser.mjs
git commit -m "test(browser): cover Supabase auth, library and profile sharing flow"
```

---

### Final verification

- [ ] `npm test` → unit + server PASS, RLS PASS (ไม่ใช่ SKIP) — แสดง output จริง
- [ ] `npm run build` → สำเร็จ
- [ ] `grep -rn "SUPABASE_SERVICE_ROLE_KEY" src dist || echo "not in client"` → `not in client`
- [ ] `git status --short | grep -E "\.env$" || echo "env not tracked"` → `env not tracked`
- [ ] ตรวจเกณฑ์ว่าเสร็จ 6 ข้อใน Spec ข้อ 1 ทีละข้อ รายงานข้อที่ตรวจไม่ได้ตรงๆ
- [ ] ใช้ superpowers:requesting-code-review กับทั้ง branch
