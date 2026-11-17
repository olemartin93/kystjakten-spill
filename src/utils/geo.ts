import type { LatLng } from '../types/vessel'

const EARTH_RADIUS_M = 6_371_008.8
export const METERS_PER_NAUTICAL_MILE = 1852
const KNOT_IN_MPS = 1852 / 3600

const toRad = (deg: number): number => (deg * Math.PI) / 180
const toDeg = (rad: number): number => (rad * 180) / Math.PI

/** Normalize any angle to the range [0, 360). */
export function normalizeAngle(deg: number): number {
  const a = deg % 360
  return a < 0 ? a + 360 : a
}

/** Smallest absolute difference between two bearings, in degrees (0–180). */
export function angleDifference(a: number, b: number): number {
  const d = Math.abs(normalizeAngle(a) - normalizeAngle(b))
  return d > 180 ? 360 - d : d
}

/** Great-circle distance in metres (haversine). */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.latitude - a.latitude)
  const dLon = toRad(b.longitude - a.longitude)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Initial great-circle bearing from a to b, degrees [0, 360). */
export function bearingDegrees(a: LatLng, b: LatLng): number {
  const φ1 = toRad(a.latitude)
  const φ2 = toRad(b.latitude)
  const Δλ = toRad(b.longitude - a.longitude)
  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  return normalizeAngle(toDeg(Math.atan2(y, x)))
}

/** Point reached travelling `distance` metres from `start` on `bearing` degrees. */
export function destinationPoint(start: LatLng, bearing: number, distance: number): LatLng {
  const δ = distance / EARTH_RADIUS_M
  const θ = toRad(bearing)
  const φ1 = toRad(start.latitude)
  const λ1 = toRad(start.longitude)
  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ))
  const λ2 =
    λ1 +
    Math.atan2(Math.sin(θ) * Math.sin(δ) * Math.cos(φ1), Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2))
  return { latitude: toDeg(φ2), longitude: ((toDeg(λ2) + 540) % 360) - 180 }
}

export const knotsToMetersPerSecond = (knots: number): number => knots * KNOT_IN_MPS

const COMPASS_NB = ['N', 'NØ', 'Ø', 'SØ', 'S', 'SV', 'V', 'NV'] as const
const COMPASS_WORDS_NB = [
  'nord',
  'nordøst',
  'øst',
  'sørøst',
  'sør',
  'sørvest',
  'vest',
  'nordvest',
] as const

function compassIndex(deg: number): number {
  return Math.round(normalizeAngle(deg) / 45) % 8
}

/** Eight-point compass abbreviation in Norwegian (N, NØ, Ø …). */
export function compassPoint(deg: number): string {
  return COMPASS_NB[compassIndex(deg)] ?? 'N'
}

/** Eight-point compass word in Norwegian (nord, nordøst …). */
export function compassWord(deg: number): string {
  return COMPASS_WORDS_NB[compassIndex(deg)] ?? 'nord'
}

/** Approximate circle polygon (for range rings), returned as [lng, lat] pairs. */
export function circlePolygon(
  center: LatLng,
  radiusMeters: number,
  steps = 96,
): [number, number][] {
  const coords: [number, number][] = []
  for (let i = 0; i <= steps; i++) {
    const p = destinationPoint(center, (i / steps) * 360, radiusMeters)
    coords.push([p.longitude, p.latitude])
  }
  return coords
}
