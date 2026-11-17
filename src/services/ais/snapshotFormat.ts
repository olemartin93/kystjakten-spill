/**
 * Compact snapshot format published next to the static site (data/ais.json).
 *
 * It is produced at deploy time by scripts/fetch-ais-snapshot.ts from the BarentsWatch
 * Live AIS API, so the browser never needs an API secret.
 *
 * This file must not have runtime imports: it is also executed directly by Node.
 */

export const SNAPSHOT_FIELDS = [
  'mmsi',
  'name',
  'lat',
  'lon',
  'sog',
  'cog',
  'hdg',
  'type',
  'len',
  'dest',
  't',
] as const

export type SnapshotRow = [
  mmsi: number,
  name: string | null,
  lat: number,
  lon: number,
  sog: number,
  cog: number | null,
  hdg: number | null,
  type: number | null,
  len: number | null,
  dest: string | null,
  t: number,
]

export interface SnapshotFileV1 {
  version: 1
  source: string
  license: string
  attribution: string
  /** ISO timestamp of when the snapshot was fetched. */
  generatedAt: string
  fields: typeof SNAPSHOT_FIELDS
  vessels: SnapshotRow[]
}

export interface TransformOptions {
  now: Date
  /** Ignore positions older than this many minutes. */
  maxAgeMinutes: number
  /** [minLon, minLat, maxLon, maxLat] */
  bbox: [number, number, number, number]
}

export const DEFAULT_BBOX: [number, number, number, number] = [-6, 54, 42, 82]

type RawRecord = Record<string, unknown>

const num = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v)
    ? v
    : typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))
      ? Number(v)
      : null

const str = (v: unknown): string | null => {
  if (typeof v !== 'string') return null
  const cleaned = v.replace(/[@\s]+/g, ' ').trim()
  return cleaned === '' ? null : cleaned
}

const round = (v: number, digits: number): number => {
  const f = 10 ** digits
  return Math.round(v * f) / f
}

/** Accepts both the JSON and the GeoJSON variant of the BarentsWatch "combined" model. */
function flatten(record: unknown): RawRecord | null {
  if (record === null || typeof record !== 'object') return null
  const r = record as RawRecord
  if (r.properties && typeof r.properties === 'object') {
    const props = r.properties as RawRecord
    const geometry = r.geometry as { coordinates?: unknown } | undefined
    const coords = Array.isArray(geometry?.coordinates) ? (geometry.coordinates as unknown[]) : []
    return { ...props, longitude: coords[0], latitude: coords[1] }
  }
  return r
}

/** Classes of MMSI that are not ships: base stations (00…), aids to navigation (99…), SAR aircraft (111…). */
function isShipMmsi(mmsi: number): boolean {
  if (!Number.isInteger(mmsi) || mmsi < 100_000_000 || mmsi > 999_999_999) return false
  const s = String(mmsi)
  return !s.startsWith('99') && !s.startsWith('111') && !s.startsWith('98')
}

export function transformBarentsWatchRecord(
  record: unknown,
  options: TransformOptions,
): SnapshotRow | null {
  const r = flatten(record)
  if (!r) return null
  const mmsi = num(r.mmsi)
  const lat = num(r.latitude)
  const lon = num(r.longitude)
  const sogRaw = num(r.speedOverGround)
  const msgtime = typeof r.msgtime === 'string' ? Date.parse(r.msgtime) : NaN
  if (mmsi === null || lat === null || lon === null || sogRaw === null || Number.isNaN(msgtime))
    return null
  if (!isShipMmsi(mmsi)) return null
  const [minLon, minLat, maxLon, maxLat] = options.bbox
  if (lat < minLat || lat > maxLat || lon < minLon || lon > maxLon) return null
  if (sogRaw < 0 || sogRaw >= 102.2) return null
  const ageMinutes = (options.now.getTime() - msgtime) / 60_000
  if (ageMinutes > options.maxAgeMinutes || ageMinutes < -10) return null

  const cogRaw = num(r.courseOverGround)
  const cog = cogRaw !== null && cogRaw >= 0 && cogRaw < 360 ? round(cogRaw, 1) : null
  const hdgRaw = num(r.trueHeading)
  const hdg = hdgRaw !== null && hdgRaw >= 0 && hdgRaw < 360 ? Math.round(hdgRaw) : null
  const typeRaw = num(r.shipType)
  const type = typeRaw !== null && typeRaw > 0 && typeRaw < 100 ? Math.round(typeRaw) : null

  let len = num(r.shipLength)
  if (len === null || len <= 0) {
    const a = num(r.dimensionA)
    const b = num(r.dimensionB)
    len = a !== null && b !== null && a + b > 0 ? a + b : null
  }
  if (len !== null && (len > 500 || len <= 0)) len = null

  return [
    mmsi,
    str(r.name),
    round(lat, 5),
    round(lon, 5),
    round(sogRaw, 1),
    cog,
    hdg,
    type,
    len,
    str(r.destination),
    Math.round(msgtime / 1000),
  ]
}

export function buildSnapshot(records: unknown, options: TransformOptions): SnapshotFileV1 {
  const list: unknown[] = Array.isArray(records)
    ? records
    : records !== null &&
        typeof records === 'object' &&
        Array.isArray((records as RawRecord).features)
      ? ((records as RawRecord).features as unknown[])
      : []
  const byMmsi = new Map<number, SnapshotRow>()
  for (const record of list) {
    const row = transformBarentsWatchRecord(record, options)
    if (!row) continue
    const existing = byMmsi.get(row[0])
    if (!existing || existing[10] < row[10]) byMmsi.set(row[0], row)
  }
  return {
    version: 1,
    source: 'BarentsWatch Live AIS API – data fra Kystverket',
    license: 'Norsk lisens for offentlige data (NLOD) 2.0',
    attribution: 'AIS-data: Kystverket via BarentsWatch',
    generatedAt: options.now.toISOString(),
    fields: SNAPSHOT_FIELDS,
    vessels: [...byMmsi.values()].sort((a, b) => a[0] - b[0]),
  }
}
