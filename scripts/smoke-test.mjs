// Post-deploy smoke test: loads the live site in Chromium and checks that the PWA, map,
// AIS data and a game round work. Usage: node scripts/smoke-test.mjs <url> [outDir]
// Requires the `playwright` package (installed ad hoc in CI).
import { mkdir, appendFile } from 'node:fs/promises'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { chromium, devices } = require('playwright')

const base = (process.argv[2] ?? '').replace(/\/?$/, '/')
const outDir = process.argv[3] ?? 'smoke'
if (!base.startsWith('http')) {
  console.error('Usage: node scripts/smoke-test.mjs <url> [outDir]')
  process.exit(2)
}
await mkdir(outDir, { recursive: true })

const results = []
let failed = false
const check = (name, ok, detail = '', { warnOnly = false } = {}) => {
  const status = ok ? 'pass' : warnOnly ? 'warn' : 'FAIL'
  if (!ok && !warnOnly) failed = true
  results.push({ name, status, detail })
  console.log(`${status.padEnd(4)}  ${name}${detail ? ` – ${detail}` : ''}`)
}

async function head(url) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(20_000) })
    return {
      status: r.status,
      type: r.headers.get('content-type') ?? '',
      body: r.ok ? await r.text() : '',
    }
  } catch (e) {
    return { status: 0, type: '', body: '', error: String(e) }
  }
}

// ---- static assets ----
const index = await head(base)
check('index.html', index.status === 200 && index.body.includes('Fyrvakt'), `HTTP ${index.status}`)
const manifest = await head(`${base}manifest.webmanifest`)
check('manifest.webmanifest', manifest.status === 200, `HTTP ${manifest.status}`)
let manifestJson = null
try {
  manifestJson = JSON.parse(manifest.body)
} catch {
  /* reported below */
}
check(
  'manifest scope matches base path',
  manifestJson?.scope && base.endsWith(manifestJson.scope),
  manifestJson?.scope ?? 'n/a',
)
for (const icon of manifestJson?.icons ?? []) {
  const r = await head(new URL(icon.src, `${base}manifest.webmanifest`).href)
  check(`icon ${icon.src}`, r.status === 200, `HTTP ${r.status}`)
}
const sw = await head(`${base}sw.js`)
check('service worker script', sw.status === 200, `HTTP ${sw.status}`)
const deepLink = await head(`${base}some/deep/link`)
check('SPA fallback (404.html)', deepLink.body.includes('Fyrvakt'), `HTTP ${deepLink.status}`)

const data = await head(`${base}data/ais.json`)
let vesselCount = 0
let ageMinutes = Infinity
try {
  const json = JSON.parse(data.body)
  vesselCount = json.vessels.length
  ageMinutes = (Date.now() - Date.parse(json.generatedAt)) / 60_000
} catch {
  /* reported below */
}
const hasData = data.status === 200 && vesselCount > 0
check(
  'AIS snapshot',
  hasData,
  hasData
    ? `${vesselCount} vessels, ${ageMinutes.toFixed(0)} min old`
    : `HTTP ${data.status} – configure BarentsWatch secrets`,
  { warnOnly: true },
)

const chart = await head(
  'https://cache.kartverket.no/v1/wmts/1.0.0/sjokartraster/default/webmercator/7/36/66.png',
)
check(
  'Kartverket sea chart tile',
  chart.status === 200 && chart.type.startsWith('image/'),
  `HTTP ${chart.status} ${chart.type}`,
  { warnOnly: true },
)

// ---- browser ----
// Headless runners have no GPU: use SwiftShader so WebGL (MapLibre) works.
const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
const context = await browser.newContext({ ...devices['iPhone 13'] })
const page = await context.newPage()
const pageErrors = []
page.on('pageerror', (e) => pageErrors.push(e.message))
let tileResponses = 0
page.on('response', (r) => {
  if (r.url().includes('tiles.openfreemap.org') && r.status() === 200) tileResponses++
})

await page.goto(base, { waitUntil: 'load' })
const mapReady = await page
  .waitForSelector('[data-map-ready="true"]', { timeout: 30_000 })
  .then(() => true)
  .catch(() => false)
check('map initialised (MapLibre)', mapReady)
await page.waitForTimeout(3000)
check('basemap tiles loaded (OpenFreeMap)', tileResponses > 0, `${tileResponses} responses`)
const swReady = await page
  .evaluate(() =>
    Promise.race([
      navigator.serviceWorker.ready.then(() => true),
      new Promise((r) => setTimeout(() => r(false), 15_000)),
    ]),
  )
  .catch(() => false)
check('service worker active', swReady)
await page.screenshot({ path: `${outDir}/1-start.png` })

if (hasData) {
  const start = page.getByRole('button', { name: /Start jakten/ })
  await start.waitFor({ timeout: 20_000 })
  await start.click()
  const objective = await page
    .locator('#objective')
    .textContent({ timeout: 15_000 })
    .catch(() => null)
  check('game round started', Boolean(objective), objective ?? 'no objective')
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${outDir}/2-round.png` })
  await page.keyboard.press('a')
  const confirm = page.getByRole('button', { name: /^Velg / })
  const picked = await confirm
    .click({ timeout: 5000 })
    .then(() => true)
    .catch(() => false)
  check('vessel selected and submitted', picked)
  const revealed = await page
    .getByRole('button', { name: /Neste runde|Se resultatet/ })
    .waitFor({ timeout: 5000 })
    .then(() => true)
    .catch(() => false)
  check('answer feedback shown', revealed)
  await page.screenshot({ path: `${outDir}/3-reveal.png` })
} else {
  const friendly = await page
    .getByRole('alert')
    .textContent({ timeout: 10_000 })
    .catch(() => '')
  check('friendly message without data', Boolean(friendly), (friendly ?? '').slice(0, 80))
}

await page.reload({ waitUntil: 'load' })
check('reload works', (await page.title()).includes('Fyrvakt'))
check('no uncaught page errors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '))
await browser.close()

if (process.env.GITHUB_STEP_SUMMARY) {
  const rows = results.map(
    (r) =>
      `| ${r.status === 'pass' ? '✅' : r.status === 'warn' ? '⚠️' : '❌'} | ${r.name} | ${r.detail} |`,
  )
  await appendFile(
    process.env.GITHUB_STEP_SUMMARY,
    `## Smoke test: ${base}\n\n| | Check | Detail |\n|---|---|---|\n${rows.join('\n')}\n`,
  )
}
process.exit(failed ? 1 : 0)
