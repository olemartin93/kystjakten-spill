import type { AisSnapshot, LatLng, Vessel } from '../../types/vessel'
import { destinationPoint, knotsToMetersPerSecond } from '../../utils/geo'
import { AisError } from './errors'
import { categoryForShipType } from './shipTypes'

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const optionalNumber = (v: unknown): number | null => (isFiniteNumber(v) ? v : null)
const optionalString = (v: unknown): string | null =>
  typeof v === 'string' && v.trim() !== '' ? v.trim() : null

/** Validate one compact snapshot row and turn it into a Vessel. Returns null for invalid rows. */
export function normalizeRow(row: unknown): Vessel | null {
  if (!Array.isArray(row) || row.length < 11) return null
  const [mmsi, name, lat, lon, sog, cog, hdg, type, len, dest, t] = row as unknown[]
  if (!isFiniteNumber(mmsi) || !isFiniteNumber(lat) || !isFiniteNumber(lon)) return null
  if (!isFiniteNumber(sog) || !isFiniteNumber(t)) return null
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null
  if (sog < 0 || sog > 102.2) return null

  const course = optionalNumber(cog)
  const heading = optionalNumber(hdg)
  const shipType = optionalNumber(type)
  const length = optionalNumber(len)
  return {
    id: String(mmsi),
    mmsi,
    name: optionalString(name) ?? `Ukjent fartøy ${String(mmsi).slice(-4)}`,
    latitude: lat,
    longitude: lon,
    speed: sog,
    course: course !== null && course >= 0 && course < 360 ? course : null,
    heading: heading !== null && heading >= 0 && heading < 360 ? heading : null,
    shipType,
    category: categoryForShipType(shipType),
    length: length !== null && length > 0 ? length : null,
    destination: optionalString(dest),
    timestamp: t * 1000,
  }
}

/** Parse the published snapshot JSON into the app's AisSnapshot model. */
export function normalizeSnapshot(json: unknown): AisSnapshot {
  if (json === null || typeof json !== 'object')
    throw new AisError('invalid', 'Snapshot is not an object')
  const data = json as Record<string, unknown>
  if (data.version !== 1 || !Array.isArray(data.vessels)) {
    throw new AisError('invalid', 'Unsupported snapshot format')
  }
  const generatedAt = typeof data.generatedAt === 'string' ? Date.parse(data.generatedAt) : NaN
  if (Number.isNaN(generatedAt)) throw new AisError('invalid', 'Snapshot has no timestamp')

  const seen = new Set<string>()
  const vessels: Vessel[] = []
  for (const row of data.vessels as unknown[]) {
    const vessel = normalizeRow(row)
    if (!vessel || seen.has(vessel.id)) continue
    seen.add(vessel.id)
    vessels.push(vessel)
  }
  if (vessels.length === 0) throw new AisError('empty', 'Snapshot contains no valid vessels')

  return {
    vessels,
    generatedAt,
    source: typeof data.source === 'string' ? data.source : 'BarentsWatch',
    license: typeof data.license === 'string' ? data.license : 'NLOD 2.0',
  }
}

/** Longest time we dead-reckon a vessel forward from its last AIS message. */
export const MAX_PROJECTION_MS = 20 * 60_000

/**
 * Estimated current position by dead reckoning from the last AIS message
 * (speed × elapsed time along the course over ground). Capped to avoid drifting
 * far away from reality when data is old.
 */
export function projectPosition(vessel: Vessel, now: number): LatLng {
  const origin = { latitude: vessel.latitude, longitude: vessel.longitude }
  if (vessel.course === null || vessel.speed < 0.5) return origin
  const elapsed = Math.min(Math.max(0, now - vessel.timestamp), MAX_PROJECTION_MS)
  if (elapsed === 0) return origin
  return destinationPoint(
    origin,
    vessel.course,
    knotsToMetersPerSecond(vessel.speed) * (elapsed / 1000),
  )
}

/** Direction the vessel is moving (course over ground), falling back to its heading. */
export const vesselDirection = (vessel: Vessel): number | null => vessel.course ?? vessel.heading
