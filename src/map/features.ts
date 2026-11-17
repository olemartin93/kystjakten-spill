import type { Feature, FeatureCollection, LineString, Point } from 'geojson'
import { VECTOR_MINUTES } from '../config/mapConfig'
import { projectPosition, vesselDirection } from '../services/ais/normalize'
import type { LatLng, Vessel } from '../types/vessel'
import {
  circlePolygon,
  destinationPoint,
  knotsToMetersPerSecond,
  METERS_PER_NAUTICAL_MILE,
} from '../utils/geo'

export type MarkerState = 'idle' | 'selected' | 'correct' | 'wrong' | 'missed' | 'dimmed'

export interface FleetMarker {
  vessel: Vessel
  letter: string
  state: MarkerState
}

const MOVING_KNOTS = 0.5
const isMoving = (v: Vessel): boolean => v.speed >= MOVING_KNOTS && vesselDirection(v) !== null

const point = (p: LatLng): Point => ({ type: 'Point', coordinates: [p.longitude, p.latitude] })

export function fleetFeatures(markers: FleetMarker[], now: number): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: markers.map(({ vessel, letter, state }) => {
      const moving = isMoving(vessel)
      return {
        type: 'Feature',
        id: vessel.mmsi,
        geometry: point(projectPosition(vessel, now)),
        properties: {
          id: vessel.id,
          letter,
          state,
          icon: `ship-${vessel.category}${moving ? '' : '-still'}`,
          badge: `badge-${letter}`,
          dir: moving ? (vesselDirection(vessel) ?? 0) : 0,
          length: vessel.length ?? 40,
        },
      }
    }),
  }
}

/** Radar-style speed vectors: a line to where the vessel will be in VECTOR_MINUTES. */
export function vectorFeatures(vessels: Vessel[], now: number): FeatureCollection<LineString> {
  const features: Feature<LineString>[] = []
  for (const v of vessels) {
    if (!isMoving(v)) continue
    const from = projectPosition(v, now)
    const to = destinationPoint(
      from,
      vesselDirection(v) ?? 0,
      knotsToMetersPerSecond(v.speed) * VECTOR_MINUTES * 60,
    )
    features.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [from.longitude, from.latitude],
          [to.longitude, to.latitude],
        ],
      },
      properties: { category: v.category },
    })
  }
  return { type: 'FeatureCollection', features }
}

/** Ambient traffic shown as quiet radar blips behind menus. */
export function trafficFeatures(vessels: Vessel[], now: number): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: vessels.map((v) => ({
      type: 'Feature',
      geometry: point(projectPosition(v, now)),
      properties: { category: v.category, moving: isMoving(v) },
    })),
  }
}

/** Concentric range rings every nautical mile. */
export function ringFeatures(center: LatLng | null, rings = 4): FeatureCollection<LineString> {
  if (!center) return { type: 'FeatureCollection', features: [] }
  return {
    type: 'FeatureCollection',
    features: Array.from({ length: rings }, (_, i) => ({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: circlePolygon(center, (i + 1) * METERS_PER_NAUTICAL_MILE),
      },
      properties: { ring: i + 1 },
    })),
  }
}

/** [[west, south], [east, north]] around the given points, or null if empty. */
export function boundsOf(points: LatLng[]): [[number, number], [number, number]] | null {
  if (points.length === 0) return null
  let w = Infinity
  let s = Infinity
  let e = -Infinity
  let n = -Infinity
  for (const p of points) {
    w = Math.min(w, p.longitude)
    e = Math.max(e, p.longitude)
    s = Math.min(s, p.latitude)
    n = Math.max(n, p.latitude)
  }
  return [
    [w, s],
    [e, n],
  ]
}
