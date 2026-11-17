import { describe, expect, it } from 'vitest'
import { normalizeSnapshot } from './normalize'
import type { TransformOptions } from './snapshotFormat'
import { buildSnapshot, DEFAULT_BBOX, transformBarentsWatchRecord } from './snapshotFormat'

const options: TransformOptions = {
  now: new Date('2026-11-17T12:00:00Z'),
  maxAgeMinutes: 60,
  bbox: DEFAULT_BBOX,
}

// Shape of a BarentsWatch "latest combined" record (modelType=Full, modelFormat=Json).
const record = {
  courseOverGround: 23.6,
  latitude: 62.473451,
  longitude: 6.151234,
  name: 'KYSTFERJA  ',
  rateOfTurn: 0,
  shipType: 60,
  speedOverGround: 8.7,
  trueHeading: 23,
  mmsi: 257000123,
  msgtime: '2026-11-17T11:58:00+00:00',
  shipLength: 0,
  dimensionA: 80,
  dimensionB: 30,
  destination: 'ALESUND@@@',
}

describe('transformBarentsWatchRecord', () => {
  it('converts a combined JSON record to a compact row', () => {
    expect(transformBarentsWatchRecord(record, options)).toEqual([
      257000123,
      'KYSTFERJA',
      62.47345,
      6.15123,
      8.7,
      23.6,
      23,
      60,
      110,
      'ALESUND',
      Date.parse('2026-11-17T11:58:00Z') / 1000,
    ])
  })

  it('accepts the GeoJSON variant', () => {
    const { latitude, longitude, ...props } = record
    const feature = {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [longitude, latitude] },
      properties: props,
    }
    expect(transformBarentsWatchRecord(feature, options)?.[2]).toBeCloseTo(62.47345)
  })

  it.each([
    ['stale positions', { msgtime: '2026-11-17T09:00:00Z' }],
    ['speed "not available" (102.3)', { speedOverGround: 102.3 }],
    ['missing speed', { speedOverGround: null }],
    ['aids to navigation (MMSI 99…)', { mmsi: 992571234 }],
    ['base stations (MMSI 00…)', { mmsi: 2570001 }],
    ['positions outside Norwegian waters', { latitude: 40, longitude: 6 }],
    ['invalid timestamps', { msgtime: 'yesterday' }],
  ])('filters out %s', (_, patch) => {
    expect(transformBarentsWatchRecord({ ...record, ...patch }, options)).toBeNull()
  })

  it('maps "not available" course (360) and heading (511) to null', () => {
    const row = transformBarentsWatchRecord(
      { ...record, courseOverGround: 360, trueHeading: 511 },
      options,
    )
    expect(row?.[5]).toBeNull()
    expect(row?.[6]).toBeNull()
  })
})

describe('buildSnapshot', () => {
  it('deduplicates by MMSI keeping the newest message, and round-trips through the app normalizer', () => {
    const older = { ...record, msgtime: '2026-11-17T11:50:00Z', speedOverGround: 1 }
    const snapshot = buildSnapshot([older, record, { junk: true }], options)
    expect(snapshot.vessels).toHaveLength(1)
    expect(snapshot.vessels[0]?.[4]).toBe(8.7)
    const parsed = normalizeSnapshot(JSON.parse(JSON.stringify(snapshot)))
    expect(parsed.vessels[0]?.name).toBe('KYSTFERJA')
    expect(parsed.vessels[0]?.category).toBe('passenger')
  })

  it('accepts a GeoJSON FeatureCollection and tolerates garbage', () => {
    expect(buildSnapshot({ type: 'FeatureCollection', features: [] }, options).vessels).toEqual([])
    expect(buildSnapshot('nonsense', options).vessels).toEqual([])
  })
})
