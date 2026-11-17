import type { StyleSpecification } from 'maplibre-gl'
import {
  KARTVERKET_ATTRIBUTION,
  KARTVERKET_SEACHART_TILES,
  OPENFREEMAP_ATTRIBUTION,
  OPENFREEMAP_GLYPHS,
  OPENFREEMAP_TILEJSON,
} from '../config/mapConfig'

export const MAP_COLORS = {
  sea: '#061a28',
  land: '#0e2129',
  landHighlight: '#12282f',
  coast: '#1f5869',
  road: '#1b3640',
  ferry: '#2f7486',
  label: '#8fb3c4',
  waterLabel: '#3f8aa0',
  halo: '#04111c',
} as const

export const SEACHART_LAYER_ID = 'kartverket-sjokart'
export const SEACHART_SOURCE_ID = 'kartverket'

/**
 * A deliberately quiet, dark nautical style on OpenMapTiles-schema vector tiles from OpenFreeMap.
 * Only coastline, water, ferry routes, major roads and place names – the ships are the stars.
 */
export function createMapStyle(): StyleSpecification {
  const font = ['Noto Sans Regular']
  return {
    version: 8,
    glyphs: OPENFREEMAP_GLYPHS,
    sources: {
      openmaptiles: {
        type: 'vector',
        url: OPENFREEMAP_TILEJSON,
        attribution: OPENFREEMAP_ATTRIBUTION,
      },
      [SEACHART_SOURCE_ID]: {
        type: 'raster',
        tiles: [KARTVERKET_SEACHART_TILES],
        tileSize: 256,
        maxzoom: 17,
        attribution: KARTVERKET_ATTRIBUTION,
      },
    },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': MAP_COLORS.land } },
      {
        id: 'landcover',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'landcover',
        paint: { 'fill-color': MAP_COLORS.landHighlight, 'fill-opacity': 0.6 },
      },
      {
        id: 'water',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'water',
        paint: { 'fill-color': MAP_COLORS.sea },
      },
      {
        id: 'coastline',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'water',
        paint: {
          'line-color': MAP_COLORS.coast,
          'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.4, 12, 1.4],
          'line-opacity': 0.9,
        },
      },
      {
        id: SEACHART_LAYER_ID,
        type: 'raster',
        source: SEACHART_SOURCE_ID,
        layout: { visibility: 'none' },
        paint: {
          'raster-opacity': 0.9,
          'raster-saturation': -0.35,
          'raster-brightness-max': 0.62,
          'raster-contrast': 0.1,
        },
      },
      {
        id: 'boundary',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'boundary',
        filter: ['==', ['get', 'admin_level'], 2],
        paint: { 'line-color': '#2b4b57', 'line-dasharray': [3, 2], 'line-width': 0.8 },
      },
      {
        id: 'roads-major',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        filter: ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary']]],
        paint: {
          'line-color': MAP_COLORS.road,
          'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.4, 13, 2],
        },
      },
      {
        id: 'ferry-routes',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        filter: ['==', ['get', 'class'], 'ferry'],
        paint: {
          'line-color': MAP_COLORS.ferry,
          'line-width': 1,
          'line-dasharray': [2, 3],
          'line-opacity': 0.7,
        },
      },
      {
        id: 'water-names',
        type: 'symbol',
        source: 'openmaptiles',
        'source-layer': 'water_name',
        layout: {
          'text-field': ['get', 'name'],
          'text-font': font,
          'text-size': 11,
          'text-letter-spacing': 0.15,
          'symbol-placement': 'point',
        },
        paint: {
          'text-color': MAP_COLORS.waterLabel,
          'text-halo-color': MAP_COLORS.halo,
          'text-halo-width': 1,
        },
      },
      {
        id: 'place-names',
        type: 'symbol',
        source: 'openmaptiles',
        'source-layer': 'place',
        filter: ['in', ['get', 'class'], ['literal', ['city', 'town', 'village']]],
        layout: {
          'text-field': ['get', 'name'],
          'text-font': font,
          'text-size': ['match', ['get', 'class'], 'city', 13, 'town', 12, 10.5],
          'text-max-width': 8,
        },
        paint: {
          'text-color': MAP_COLORS.label,
          'text-halo-color': MAP_COLORS.halo,
          'text-halo-width': 1.2,
        },
      },
    ],
  }
}
