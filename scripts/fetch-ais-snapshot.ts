/**
 * Fetches the latest AIS positions from the BarentsWatch Live AIS API (open AIS data from
 * Kystverket, NLOD 2.0) and writes the compact snapshot that the static app reads.
 *
 * Runs in GitHub Actions with repository secrets – credentials never reach the browser.
 *
 *   BARENTSWATCH_CLIENT_ID      e.g. "you@example.com:fyrvakt"
 *   BARENTSWATCH_CLIENT_SECRET
 *   FALLBACK_SNAPSHOT_URL       optional: previously published snapshot to reuse if the API fails
 *
 * Usage: node scripts/fetch-ais-snapshot.ts [output=dist/data/ais.json]
 * Requires Node ≥ 22.18 (native TypeScript type stripping).
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { buildSnapshot, DEFAULT_BBOX } from '../src/services/ais/snapshotFormat.ts'

const TOKEN_URL = 'https://id.barentswatch.no/connect/token'
const LATEST_URL = 'https://live.ais.barentswatch.no/v1/latest/combined'
const MAX_AGE_MINUTES = 60
const FALLBACK_MAX_AGE_HOURS = 6
const output = process.argv[2] ?? 'dist/data/ais.json'

async function getToken(clientId: string, clientSecret: string): Promise<string> {
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'ais',
      grant_type: 'client_credentials',
    }),
    signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok) throw new Error(`Token request failed with HTTP ${response.status}`)
  const json = (await response.json()) as { access_token?: unknown }
  if (typeof json.access_token !== 'string') throw new Error('Token response had no access_token')
  return json.access_token
}

async function getLatest(token: string): Promise<unknown> {
  // "Full" adds ship length and destination; fall back to the default model if rejected.
  const urls = [`${LATEST_URL}?modelType=Full&modelFormat=Json`, LATEST_URL]
  let lastStatus = 0
  for (const url of urls) {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(120_000),
    })
    if (response.ok) return response.json()
    lastStatus = response.status
    console.warn(`GET ${url.replace(LATEST_URL, '<latest>')} → HTTP ${response.status}`)
  }
  throw new Error(`Latest AIS request failed with HTTP ${lastStatus}`)
}

async function write(json: unknown): Promise<void> {
  await mkdir(dirname(output), { recursive: true })
  await writeFile(output, JSON.stringify(json))
}

async function publishFallback(reason: unknown): Promise<void> {
  const url = process.env.FALLBACK_SNAPSHOT_URL
  console.warn(`Live fetch failed: ${reason instanceof Error ? reason.message : String(reason)}`)
  if (!url) throw new Error('No live data and no FALLBACK_SNAPSHOT_URL configured')
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) })
  if (!response.ok) throw new Error(`Fallback snapshot unavailable (HTTP ${response.status})`)
  const json = (await response.json()) as { version?: unknown; generatedAt?: unknown }
  const age = (Date.now() - Date.parse(String(json.generatedAt))) / 3_600_000
  if (json.version !== 1 || !(age < FALLBACK_MAX_AGE_HOURS)) {
    throw new Error('Fallback snapshot is missing, invalid or too old')
  }
  await write(json)
  console.warn(
    `Re-published previous snapshot from ${String(json.generatedAt)} (${age.toFixed(1)} h old)`,
  )
}

async function main(): Promise<void> {
  const clientId = process.env.BARENTSWATCH_CLIENT_ID
  const clientSecret = process.env.BARENTSWATCH_CLIENT_SECRET
  try {
    if (!clientId || !clientSecret) throw new Error('BarentsWatch credentials are not configured')
    const token = await getToken(clientId, clientSecret)
    const raw = await getLatest(token)
    const snapshot = buildSnapshot(raw, {
      now: new Date(),
      maxAgeMinutes: MAX_AGE_MINUTES,
      bbox: DEFAULT_BBOX,
    })
    const total = Array.isArray(raw) ? raw.length : 'unknown'
    console.log(`Received ${total} records → ${snapshot.vessels.length} vessels in snapshot`)
    if (snapshot.vessels.length === 0) throw new Error('Snapshot would be empty')
    await write(snapshot)
    console.log(`Wrote ${output}`)
  } catch (error) {
    await publishFallback(error)
  }
}

main().catch((error: unknown) => {
  console.error(`::error::${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
