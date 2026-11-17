import { projectPosition } from '../services/ais/normalize'
import type { LatLng, Vessel } from '../types/vessel'
import { distanceMeters } from '../utils/geo'

export interface Harbour {
  id: string
  name: string
  center: LatLng
}

/** Busy Norwegian waters used for the daily challenge and as fallbacks when the player is far from the sea. */
export const HARBOURS: Harbour[] = [
  { id: 'alesund', name: 'Ålesund', center: { latitude: 62.4722, longitude: 6.1495 } },
  { id: 'bergen', name: 'Bergen', center: { latitude: 60.399, longitude: 5.3 } },
  { id: 'oslofjorden', name: 'Oslofjorden', center: { latitude: 59.665, longitude: 10.6 } },
  { id: 'stavanger', name: 'Stavanger', center: { latitude: 58.98, longitude: 5.7 } },
  { id: 'trondheim', name: 'Trondheimsfjorden', center: { latitude: 63.46, longitude: 10.35 } },
  { id: 'tromso', name: 'Tromsø', center: { latitude: 69.66, longitude: 18.97 } },
  { id: 'bodo', name: 'Bodø', center: { latitude: 67.29, longitude: 14.35 } },
  { id: 'kristiansand', name: 'Kristiansand', center: { latitude: 58.13, longitude: 8.02 } },
  { id: 'haugesund', name: 'Haugesund', center: { latitude: 59.41, longitude: 5.25 } },
  { id: 'lofoten', name: 'Lofoten', center: { latitude: 68.22, longitude: 14.56 } },
  { id: 'hammerfest', name: 'Hammerfest', center: { latitude: 70.67, longitude: 23.65 } },
  { id: 'floro', name: 'Florø', center: { latitude: 61.6, longitude: 5.0 } },
]

export const DEFAULT_HARBOUR = HARBOURS[0] as Harbour

export const MIN_POOL = 10
export const POOL_MAX = 60
const SEARCH_RADII_M = [20_000, 40_000, 80_000, 150_000]
/** Harbour fallbacks only accept nearby traffic, so the map is never centred far from the fleet. */
const HARBOUR_RADII_M = [20_000, 40_000]

export interface PlayArea {
  center: LatLng
  radiusMeters: number
  /** Nearest vessels first, at most POOL_MAX. */
  pool: Vessel[]
  /** Set when the player was moved to a busier harbour. */
  relocatedTo: Harbour | null
}

/** Vessels within `radius` metres of `center` at time `now`, nearest first. */
export function vesselsNear(
  vessels: Vessel[],
  center: LatLng,
  radius: number,
  now: number,
): Vessel[] {
  return vessels
    .map((v) => ({ v, d: distanceMeters(projectPosition(v, now), center) }))
    .filter((x) => x.d <= radius)
    .sort((a, b) => a.d - b.d || a.v.mmsi - b.v.mmsi)
    .map((x) => x.v)
}

function searchAround(
  vessels: Vessel[],
  center: LatLng,
  now: number,
  radii: number[] = SEARCH_RADII_M,
): { pool: Vessel[]; radius: number } | null {
  for (const radius of radii) {
    const near = vesselsNear(vessels, center, radius, now)
    if (near.length >= MIN_POOL) return { pool: near.slice(0, POOL_MAX), radius }
  }
  return null
}

/**
 * Find a play area around `center`. If it is too quiet (e.g. the player is inland),
 * fall back to the nearest busy harbour.
 */
export function findPlayArea(vessels: Vessel[], center: LatLng, now: number): PlayArea | null {
  const local = searchAround(vessels, center, now)
  if (local) return { center, radiusMeters: local.radius, pool: local.pool, relocatedTo: null }
  const byDistance = [...HARBOURS].sort(
    (a, b) => distanceMeters(a.center, center) - distanceMeters(b.center, center),
  )
  for (const harbour of byDistance) {
    const found = searchAround(vessels, harbour.center, now, HARBOUR_RADII_M)
    if (found) {
      return {
        center: harbour.center,
        radiusMeters: found.radius,
        pool: found.pool,
        relocatedTo: harbour,
      }
    }
  }
  return null
}

export const CLUSTER_SIZE = 24
const CLUSTER_RADIUS_M = 25_000

/**
 * The vessels nearest to `anchor` – each round plays out in one local patch of sea so the
 * whole fleet fits comfortably on a phone screen.
 */
export function localCluster(pool: Vessel[], anchor: Vessel, now: number): Vessel[] {
  const center = projectPosition(anchor, now)
  const near = vesselsNear(pool, center, CLUSTER_RADIUS_M, now)
  if (near.length >= 8) return near.slice(0, CLUSTER_SIZE)
  return vesselsNear(pool, center, Number.POSITIVE_INFINITY, now).slice(0, CLUSTER_SIZE)
}
