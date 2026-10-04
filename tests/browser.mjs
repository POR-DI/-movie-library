// node --env-file=.env tests/browser.mjs  (starts next dev itself; stop npm run dev first)
// Movie data comes from the server's sample catalog. Accounts and library use the real Supabase
// project in .env; throwaway users are deleted at the end.
// Optional: PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { createServer as createNetServer } from 'node:net'
import { createClient } from '@supabase/supabase-js'

for (const name of [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
])
  if (!process.env[name]) {
    console.log(`SKIP browser test: ${name} is not set (nothing was checked)`)
    process.exit(0)
  }
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
)
const run = Date.now().toString(36)
const email = `browser-${run}@example.com`
const username = 'browser_' + run
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
  [
    'node_modules/next/dist/bin/next',
    'dev',
    '-p',
    String(port),
    '-H',
    '127.0.0.1',
  ],
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
for (const path of [
  '/',
  '/movies',
  '/movies/157336',
  '/login',
  '/register',
  '/library',
  '/settings/profile',
  '/u/x',
  '/about',
])
  await fetch(origin + path)
const browser = await chromium.launch({ headless: true })
await mkdir('test-results', { recursive: true })
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
})
const page = await context.newPage()
page.setDefaultTimeout(15000)
const errors = []
page.on('pageerror', (error) => errors.push(error.message))
async function intercept(ctx) {
  await ctx.route('https://image.tmdb.org/**', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="500" height="750"><rect width="500" height="750" fill="#29372b"/></svg>',
    }),
  )
  await ctx.route('https://fonts.googleapis.com/**', (route) =>
    route.fulfill({ contentType: 'text/css', body: '' }),
  )
}
await intercept(context)
const notFound = 'ไม่พบโปรไฟล์ หรือโปรไฟล์นี้เป็นส่วนตัว'
// The UI updates optimistically, so wait for Supabase to confirm before a full page navigation
// (page.goto would otherwise cancel the in-flight write).
const saved = (method) =>
  page.waitForResponse(
    (r) =>
      r.url().includes('/rest/v1/library_items') &&
      r.request().method() === method &&
      r.ok(),
  )
try {
  // Catalog smoke (sample data from the Node server)
  await page.goto(origin)
  await page.locator('.movie-card').first().waitFor()
  await page.goto(origin + '/movies')
  await page.getByLabel('ชื่อภาพยนตร์').fill('Inter')
  await page.getByLabel('ชื่อภาพยนตร์').press('Enter')
  await page
    .getByRole('link', { name: 'ดูรายละเอียด Interstellar', exact: true })
    .waitFor()
  await page.goto(origin + '/movies/157336')
  await page.locator('.overview').waitFor()
  // Guest: library buttons lead to login
  await page
    .getByRole('link', {
      name: 'ถูกใจ: Interstellar (ต้องเข้าสู่ระบบ)',
      exact: true,
    })
    .click()
  await page.waitForURL('**/login?next=%2Fmovies%2F157336')
  // Register (validation first)
  await page.goto(origin + '/register?next=/movies/157336')
  await page.getByLabel('ชื่อที่แสดง', { exact: true }).fill('Cinema Friend')
  await page
    .getByLabel('ชื่อผู้ใช้ (ใช้ในลิงก์โปรไฟล์)')
    .fill('Browser_' + run)
  await page.getByLabel('อีเมล', { exact: true }).fill(email)
  await page.getByLabel('รหัสผ่าน', { exact: true }).fill('screen-test-123')
  await page.getByLabel('ยืนยันรหัสผ่าน', { exact: true }).fill('wrong')
  await page
    .getByRole('button', { name: 'สร้างบัญชีของฉัน', exact: true })
    .click()
  await page.getByText('รหัสผ่านไม่ตรงกัน', { exact: true }).waitFor()
  await page
    .getByLabel('ยืนยันรหัสผ่าน', { exact: true })
    .fill('screen-test-123')
  await page
    .getByRole('button', { name: 'สร้างบัญชีของฉัน', exact: true })
    .click()
  await page.waitForURL('**/movies/157336')
  // Like Interstellar, watchlist Inception
  await Promise.all([
    saved('POST'),
    page
      .getByRole('button', { name: 'ถูกใจ: Interstellar', exact: true })
      .click(),
  ])
  await page
    .getByRole('button', { name: 'เลิกถูกใจ: Interstellar', exact: true })
    .waitFor()
  await page.goto(origin + '/movies/27205')
  await Promise.all([
    saved('POST'),
    page
      .getByRole('button', { name: 'เพิ่มในอยากดู: Inception', exact: true })
      .click(),
  ])
  await page
    .getByRole('button', { name: 'นำออกจากอยากดู: Inception', exact: true })
    .waitFor()
  // Persisted in Supabase across reload
  await page.goto(origin + '/library')
  await page.reload()
  await page
    .getByRole('link', { name: 'ดูรายละเอียด Interstellar', exact: true })
    .waitFor()
  assert.equal(
    await page.getByRole('link', { name: 'ดูรายละเอียด Inception' }).count(),
    0,
  )
  await page.getByRole('tab', { name: /อยากดู/ }).click()
  await page
    .getByRole('link', { name: 'ดูรายละเอียด Inception', exact: true })
    .waitFor()
  // Owner sees own private profile
  const profilePath = '/u/' + username
  await page.goto(origin + profilePath)
  const badge = page.getByText('ส่วนตัว — มีแค่คุณที่เห็น')
  await badge.waitFor()
  // Thai text must not get letter-spacing and must stay readable
  const badgeStyle = await badge.evaluate((el) => {
    const css = getComputedStyle(el)
    return { spacing: css.letterSpacing, size: parseFloat(css.fontSize) }
  })
  assert.equal(badgeStyle.spacing, 'normal', 'Thai badge letter-spacing')
  assert.ok(badgeStyle.size >= 12, 'Thai badge font-size ' + badgeStyle.size)
  // Guest cannot see a private profile
  const guest = await browser.newContext()
  await intercept(guest)
  const friend = await guest.newPage()
  friend.setDefaultTimeout(15000)
  await friend.goto(origin + profilePath)
  await friend.getByRole('heading', { name: notFound }).waitFor()
  // Public → guest sees liked only, read-only, even with an uppercase URL
  await page.goto(origin + '/settings/profile')
  await page.getByRole('switch').click()
  await page
    .getByRole('switch', { name: 'เปลี่ยนเป็นส่วนตัว' })
    .waitFor()
  await friend.goto(origin + '/u/' + username.toUpperCase())
  await friend
    .getByRole('heading', { name: 'หนังที่ Cinema Friend ถูกใจ.' })
    .waitFor()
  assert.equal(await friend.locator('.movie-card').count(), 1)
  assert.equal(await friend.getByText('Inception', { exact: true }).count(), 0)
  assert.equal(await friend.locator('.save-icon').count(), 0)
  // Back to private → guest loses access immediately
  await page.getByRole('switch').click()
  await page.getByRole('switch', { name: 'เปิดเป็นสาธารณะ' }).waitFor()
  await friend.reload()
  await friend.getByRole('heading', { name: notFound }).waitFor()
  await guest.close()
  // A failed unlike on the library page must come back with a visible message
  await page.goto(origin + '/library')
  await page.route('**/rest/v1/library_items**', (route) =>
    route.request().method() === 'DELETE' ? route.abort() : route.continue(),
  )
  await page
    .getByRole('button', { name: 'เลิกถูกใจ: Interstellar', exact: true })
    .click()
  await page
    .getByRole('alert')
    .filter({ hasText: 'Interstellar' })
    .filter({ hasText: 'ไม่สำเร็จ' })
    .waitFor()
  await page
    .getByRole('link', { name: 'ดูรายละเอียด Interstellar', exact: true })
    .waitFor()
  await page.unroute('**/rest/v1/library_items**')
  // Unlike from the library
  await Promise.all([
    saved('DELETE'),
    page
      .getByRole('button', { name: 'เลิกถูกใจ: Interstellar', exact: true })
      .click(),
  ])
  await page
    .getByRole('heading', { name: 'ยังไม่มีหนังบนชั้นนี้', exact: true })
    .waitFor()
  await page.reload()
  await page
    .getByRole('heading', { name: 'ยังไม่มีหนังบนชั้นนี้', exact: true })
    .waitFor()
  // Logout → library requires login again
  await page.getByRole('button', { name: 'ออกจากระบบ', exact: true }).click()
  await page.waitForURL(origin + '/')
  await page.goto(origin + '/library')
  await page.waitForURL(/\/login\?next=\/library$/)
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    for (const path of [
      '/',
      '/movies',
      '/movies/157336',
      '/login',
      '/register',
      profilePath,
      '/about',
    ]) {
      await page.goto(origin + path)
      await page.waitForTimeout(300)
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        `Overflow: ${path} at ${width}`,
      )
    }
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(origin)
  await page.locator('.movie-card').first().waitFor()
  await page.screenshot({
    path: 'test-results/home-mobile.png',
    fullPage: true,
  })
  assert.deepEqual(errors, [])
  console.log(
    'Browser checks passed (sample catalog, real Supabase): catalog/search/detail, guest→login, register validation, like/watchlist persist across reload, owner private view, guest private/public/liked-only/uppercase URL, revoke, unlike, logout, 390/768/1440 layouts, no page errors.',
  )
} catch (error) {
  await page.screenshot({
    path: 'test-results/browser-failure.png',
    fullPage: true,
  })
  console.log((await page.locator('body').innerText()).slice(-3000))
  throw error
} finally {
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 })
  for (const u of data?.users || [])
    if (u.email === email) await admin.auth.admin.deleteUser(u.id)
  await browser.close()
  next.kill('SIGTERM')
}
