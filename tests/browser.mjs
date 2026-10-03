// Optional: PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node tests/browser.mjs
// All TMDB responses/images are intercepted. No real TMDB credential is used.
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { createServer } from 'vite'
import { createApp } from '../server/index.js'
import { createMovieService } from '../server/movies.js'
import { demoMovies, genres } from '../server/demo.js'
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const backend = createApp({
  databasePath: ':memory:',
  movieService: createMovieService(''),
})
await new Promise((resolve, reject) => {
  backend.once('error', reject)
  backend.listen(0, '127.0.0.1', resolve)
})
const vite = await createServer({
  define: {
    'import.meta.env.VITE_TMDB_TOKEN': JSON.stringify(
      'browser-test-placeholder',
    ),
  },
  server: {
    host: '127.0.0.1',
    port: 0,
    strictPort: false,
    proxy: { '/api': { target: `http://127.0.0.1:${backend.address().port}`, changeOrigin: false } },
  },
})
await vite.listen()
const origin = `http://127.0.0.1:${vite.httpServer.address().port}`
const browser = await chromium.launch({ headless: true })
await mkdir('test-results', { recursive: true })
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
})
const page = await context.newPage()
page.setDefaultTimeout(10000)
const errors = [],
  calls = []
let offline = false,
  failUpcoming = true,
  slowSearch = false
page.on('pageerror', (error) => errors.push(error.message))
const paginated = (results) => ({
  page: 1,
  total_pages: 1,
  total_results: results.length,
  results,
})
const movies = demoMovies.map((m) => ({
  ...m,
  vote_count: 123,
  popularity: 100,
  original_language: 'en',
  original_title: m.title,
  production_companies: [],
  production_countries: [],
}))
async function intercept(ctx) {
  await ctx.route('https://api.themoviedb.org/**', async (route) => {
    const url = new URL(route.request().url())
    calls.push(url)
    if (offline) return route.abort('internetdisconnected')
    const path = url.pathname.replace('/3', '')
    if (path === '/movie/upcoming' && failUpcoming)
      return route.fulfill({ status: 503, json: { success: false } })
    if (path === '/genre/movie/list') return route.fulfill({ json: { genres } })
    if (/^\/movie\/\d+$/.test(path)) {
      const movie = movies.find((m) => m.id === Number(path.split('/').at(-1)))
      if (!movie)
        return route.fulfill({ status: 404, json: { success: false } })
      const english = url.searchParams.get('language') === 'en-US'
      return route.fulfill({
        json: {
          ...movie,
          overview:
            movie.id === 27205
              ? english
                ? 'English fallback overview'
                : ''
              : movie.overview,
          videos: {
            results: [
              {
                id: 'unofficial',
                key: 'unofficial',
                site: 'YouTube',
                type: 'Trailer',
                official: false,
              },
              {
                id: 'official',
                key: 'official',
                site: 'YouTube',
                type: 'Trailer',
                official: true,
              },
            ],
          },
          recommendations: paginated(
            movies.filter((m) => m.id !== movie.id).slice(0, 6),
          ),
          similar: paginated([]),
          images: { posters: [], backdrops: [], logos: [] },
        },
      })
    }
    if (path === '/search/movie') {
      const q = url.searchParams.get('query')
      if (q === 'slow' && slowSearch) {
        await new Promise((r) => setTimeout(r, 900))
        return route
          .fulfill({
            json: paginated([{ ...movies[0], title: 'Stale result' }]),
          })
          .catch(() => {})
      }
      return route.fulfill({
        json: paginated(
          movies.filter(
            (m) =>
              m.title.toLowerCase().includes(q.toLowerCase()) ||
              (q === 'อินเซ็ปชั่น' && m.id === 27205),
          ),
        ),
      })
    }
    return route.fulfill({ json: paginated(movies) })
  })
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
try {
  await page.addInitScript(() => {
    if (!localStorage.getItem('legacy-test-key'))
      localStorage.setItem('legacy-test-key', 'preserved')
  })
  await page.goto(origin)
  await page.locator('.movie-card').first().waitFor()
  for (const name of ['Popular', 'Top Rated', 'Now Playing']) {
    await page.getByRole('button', { name, exact: true }).click()
    await page.locator('.movie-card').first().waitFor()
  }
  await page.getByRole('button', { name: 'Upcoming', exact: true }).click()
  await page.getByRole('heading', { name: 'ยังโหลดข้อมูลไม่ได้' }).waitFor()
  failUpcoming = false
  await page.getByRole('button', { name: 'ลองอีกครั้ง', exact: true }).click()
  await page.locator('.movie-card').first().waitFor()
  assert.equal(
    calls.filter((u) => u.pathname === '/3/movie/upcoming').length,
    2,
  )
  await page.getByRole('button', { name: 'Trending', exact: true }).click()
  await page.locator('.movie-card').first().waitFor()
  assert.equal(
    calls.filter((u) => u.pathname === '/3/trending/movie/week').length,
    1,
  )
  await page.screenshot({
    path: 'test-results/tmdb-home-desktop.png',
    fullPage: true,
  })
  await page.goto(origin + '/movies')
  const search = page.getByLabel('ชื่อภาพยนตร์')
  const before = calls.filter((u) => u.pathname === '/3/search/movie').length
  await search.fill('I')
  await search.fill('Inc')
  await search.fill('  Inception  ')
  await page
    .getByRole('link', { name: 'ดูรายละเอียด Inception', exact: true })
    .waitFor()
  assert.equal(
    calls.filter((u) => u.pathname === '/3/search/movie').length,
    before + 1,
  )
  assert.equal(calls.at(-1).searchParams.get('query'), 'Inception')
  slowSearch = true
  await search.fill('slow')
  await page.waitForTimeout(450)
  await search.fill('Interstellar')
  await page
    .getByRole('link', { name: 'ดูรายละเอียด Interstellar', exact: true })
    .waitFor()
  await page.waitForTimeout(600)
  assert.equal(await page.getByText('Stale result', { exact: true }).count(), 0)
  await search.fill('nothing-matches')
  await page.getByRole('heading', { name: 'ยังไม่เจอเรื่องที่ค้นหา' }).waitFor()
  await search.fill('   ')
  await page.locator('.movie-card').first().waitFor()
  assert.equal(
    calls.some(
      (u) =>
        u.pathname === '/3/search/movie' &&
        !u.searchParams.get('query')?.trim(),
    ),
    false,
  )
  await search.fill('อินเซ็ปชั่น')
  await page
    .getByRole('link', { name: 'ดูรายละเอียด Inception', exact: true })
    .click()
  await page.getByText('English fallback overview', { exact: true }).waitFor()
  assert.equal(
    await page
      .getByRole('link', { name: 'ดูตัวอย่างหนัง' })
      .getAttribute('href'),
    'https://www.youtube.com/watch?v=official',
  )
  await page
    .getByRole('button', { name: 'เพิ่มเข้าห้องสมุด: Inception', exact: true })
    .click()
  await page.getByLabel('สถานะ', { exact: true }).selectOption('watched')
  await page.getByLabel('คะแนนของฉัน').selectOption('9')
  await page.getByLabel('เรื่องโปรด', { exact: true }).check()
  await page.getByLabel('วันที่ดู').fill('2026-09-25')
  await page.getByLabel('รีวิวของฉัน').fill('Personal review')
  await page.getByLabel('ชื่อเพลย์ลิสต์ใหม่').fill('Nolan')
  await page
    .getByRole('button', { name: 'เพิ่มเพลย์ลิสต์', exact: true })
    .click()
  await page.getByLabel('Nolan', { exact: true }).waitFor()
  await page.reload()
  await page.getByLabel('รีวิวของฉัน').waitFor()
  assert.equal(
    await page.getByLabel('รีวิวของฉัน').inputValue(),
    'Personal review',
  )
  assert.equal(await page.getByLabel('คะแนนของฉัน').inputValue(), '9')
  assert.equal(
    await page.getByLabel('Nolan', { exact: true }).isChecked(),
    true,
  )
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('cineshelf:portfolio:v1:guest')),
  )
  assert.equal(stored.movies[0].tmdbMovieId, 27205)
  assert.equal('overview' in stored.movies[0], false)
  assert.equal(
    await page.evaluate(() => localStorage.getItem('legacy-test-key')),
    'preserved',
  )
  offline = true
  await page.goto(origin + '/library')
  await page.locator('.movie-card').waitFor()
  await page.getByRole('button', { name: 'บันทึกส่วนตัว', exact: true }).click()
  await page.getByLabel('รีวิวของฉัน').fill('Offline edit')
  await page.reload()
  await page.getByRole('button', { name: 'บันทึกส่วนตัว', exact: true }).click()
  assert.equal(
    await page.getByLabel('รีวิวของฉัน').inputValue(),
    'Offline edit',
  )
  offline = false
  await page.goto(origin + '/movies/157336')
  await page.locator('.overview').waitFor()
  assert.match(await page.locator('.overview').innerText(), /เมื่อโลก/)
  assert.match(
    await page.locator('.detail-backdrop').getAttribute('style'),
    /image.tmdb.org/,
  )
  await page.waitForFunction(() => {
    const img = document.querySelector('.detail-poster img')
    return img?.complete && img.naturalWidth > 0
  })
  // Preserve original account, server library, sharing and revocation behavior.
  await page.goto(origin + '/register?next=/movies/157336')
  await page.getByLabel('ชื่อที่แสดงในห้องสมุด').fill('Cinema Friend')
  await page.getByLabel('อีเมล', { exact: true }).fill('browser@example.com')
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
  await page
    .getByRole('button', {
      name: 'เพิ่มเข้าห้องสมุด: Interstellar',
      exact: true,
    })
    .click()
  await page.waitForFunction(() => {
    const p = JSON.parse(localStorage.getItem('cineshelf:portfolio:v1:1'))
    return p?.movies.length === 1 && !p.pendingSync.length
  })
  await page.goto(origin + '/library')
  await page.locator('.movie-card').waitFor()
  await page.reload()
  await page.locator('.movie-card').waitFor()
  await page
    .getByRole('button', { name: 'เปิดแชร์ห้องสมุด', exact: true })
    .click()
  const link = await page.getByLabel('ลิงก์แชร์ห้องสมุด').inputValue()
  const guest = await browser.newContext()
  await intercept(guest)
  const friend = await guest.newPage()
  await friend.goto(link)
  await friend
    .getByRole('heading', { name: 'ห้องสมุดของ Cinema Friend.' })
    .waitFor()
  assert.equal(await friend.locator('.movie-card').count(), 1)
  assert.equal(await friend.locator('.save-icon').count(), 0)
  await page.getByRole('button', { name: 'ปิดการแชร์', exact: true }).click()
  await page
    .getByRole('button', { name: 'เปิดแชร์ห้องสมุด', exact: true })
    .waitFor()
  await friend.reload()
  await friend
    .getByText('ไม่พบห้องสมุดนี้ หรือเจ้าของปิดการแชร์แล้ว', { exact: true })
    .waitFor()
  await guest.close()
  // Deleting only the new account cache simulates the first import for a pre-existing account.
  await page.evaluate(() => localStorage.removeItem('cineshelf:portfolio:v1:1'))
  await page.reload()
  await page
    .getByRole('link', { name: 'ดูรายละเอียด Interstellar', exact: true })
    .waitFor()
  await page
    .getByRole('button', {
      name: 'นำออกจากห้องสมุด: Interstellar',
      exact: true,
    })
    .click()
  await page
    .getByRole('heading', { name: 'ยังไม่มีหนังบนชั้นนี้', exact: true })
    .waitFor()
  await page.waitForFunction(
    () =>
      !JSON.parse(localStorage.getItem('cineshelf:portfolio:v1:1')).pendingSync
        .length,
  )
  await page.reload()
  await page
    .getByRole('heading', { name: 'ยังไม่มีหนังบนชั้นนี้', exact: true })
    .waitFor()
  await page.getByRole('button', { name: 'ออกจากระบบ', exact: true }).click()
  await page.waitForURL(origin + '/')
  await page.goto(origin + '/library')
  await page
    .getByRole('link', { name: 'ดูรายละเอียด Inception', exact: true })
    .waitFor()
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    for (const path of [
      '/',
      '/movies',
      '/movies/157336',
      '/library',
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
    path: 'test-results/tmdb-home-mobile.png',
    fullPage: true,
  })
  assert.deepEqual(errors, [])
  console.log(
    'Browser checks passed (mocked TMDB): five collections/retry/cache, debounce/stale/Thai search/empty, detail/Thai/English fallback/trailer/images, personal fields/playlists/reload/offline, legacy import, account/sharing/revoke/removal, guest isolation, 390/768/1440 layouts, no page errors.',
  )
} catch (error) {
  await page.screenshot({
    path: 'test-results/tmdb-failure.png',
    fullPage: true,
  })
  console.log((await page.locator('main').innerText()).slice(-3000))
  throw error
} finally {
  await browser.close()
  await vite.close()
  await new Promise((resolve) => backend.close(resolve))
}
