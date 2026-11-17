import type { ExpressionSpecification, Map as MapLibreMap } from 'maplibre-gl'
import { CATEGORY_COLOR } from '../services/ais/shipTypes'

export const FLEET_SOURCE = 'fleet'
export const VECTOR_SOURCE = 'vectors'
export const TRAFFIC_SOURCE = 'traffic'
export const RING_SOURCE = 'rings'

const EMPTY = { type: 'FeatureCollection' as const, features: [] }

const categoryColor: ExpressionSpecification = [
  'match',
  ['get', 'category'],
  ...Object.entries(CATEGORY_COLOR).flat(),
  CATEGORY_COLOR.other,
] as unknown as ExpressionSpecification

const STATE_COLOR: ExpressionSpecification = [
  'match',
  ['get', 'state'],
  'selected',
  '#ffffff',
  'correct',
  '#3ee6c1',
  'missed',
  '#3ee6c1',
  'wrong',
  '#ff6b6b',
  'rgba(0,0,0,0)',
]

/** Sources and layers for traffic, range rings, speed vectors, fleet markers and letter badges. */
export function addGameLayers(map: MapLibreMap): void {
  for (const id of [TRAFFIC_SOURCE, RING_SOURCE, VECTOR_SOURCE, FLEET_SOURCE]) {
    if (!map.getSource(id)) map.addSource(id, { type: 'geojson', data: EMPTY })
  }

  map.addLayer({
    id: 'traffic',
    type: 'circle',
    source: TRAFFIC_SOURCE,
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 1.5, 12, 3.5],
      'circle-color': categoryColor,
      'circle-opacity': 0.55,
      'circle-blur': 0.3,
    },
  })

  map.addLayer({
    id: 'range-rings',
    type: 'line',
    source: RING_SOURCE,
    paint: {
      'line-color': '#ffc24b',
      'line-opacity': 0.35,
      'line-width': 1,
      'line-dasharray': [4, 4],
    },
  })

  map.addLayer({
    id: 'speed-vectors',
    type: 'line',
    source: VECTOR_SOURCE,
    layout: { 'line-cap': 'round' },
    paint: { 'line-color': categoryColor, 'line-width': 2, 'line-opacity': 0.75 },
  })

  map.addLayer({
    id: 'fleet-halo',
    type: 'circle',
    source: FLEET_SOURCE,
    paint: {
      'circle-radius': ['match', ['get', 'state'], 'selected', 22, 'idle', 0, 'dimmed', 0, 20],
      'circle-color': 'rgba(0,0,0,0)',
      'circle-stroke-color': STATE_COLOR,
      'circle-stroke-width': ['match', ['get', 'state'], 'selected', 2.5, 3],
      'circle-stroke-opacity': 0.95,
    },
  })

  map.addLayer({
    id: 'fleet',
    type: 'symbol',
    source: FLEET_SOURCE,
    layout: {
      'icon-image': ['get', 'icon'],
      'icon-rotate': ['get', 'dir'],
      'icon-rotation-alignment': 'map',
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
      'icon-size': ['interpolate', ['linear'], ['get', 'length'], 10, 0.6, 80, 0.85, 250, 1.25],
    },
    paint: { 'icon-opacity': ['match', ['get', 'state'], 'dimmed', 0.35, 1] },
  })

  map.addLayer({
    id: 'fleet-badges',
    type: 'symbol',
    source: FLEET_SOURCE,
    layout: {
      'icon-image': ['get', 'badge'],
      'icon-anchor': 'bottom',
      'icon-offset': [0, -16],
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
      'icon-rotation-alignment': 'viewport',
    },
    paint: { 'icon-opacity': ['match', ['get', 'state'], 'dimmed', 0.35, 1] },
  })
}
