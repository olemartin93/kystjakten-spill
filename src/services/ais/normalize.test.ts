import { describe, expect, it } from 'vitest'
import { NOW, vessel } from '../../test/fixtures'
import { distanceMeters } from '../../utils/geo'
import { AisError } from './errors'
import { MAX_PROJECTION_MS, normalizeRow, normalizeSnapshot, projectPosition } from './normalize'

const row = [257123450, 'MS TESTFJORD', 62.47, 6.15, 12.3, 90.5, 91, 60, 120, 'BERGEN', NOW / 1000]

describe('normalizeRow', () => {
  it('maps a compact row to a vessel', () => {
    expect(normalizeRow(row)).toMatchObject({
      id: '257123450',
      name: 'MS TESTFJORD',
      speed: 12.3,
      course: 90.5,
      heading: 91,
      category: 'passenger',
      length: 120,
      destination: 'BERGEN',
      timestamp: NOW,
    })
  })

  it('names unnamed vessels', () => {
    expect(normalizeRow([...row.slice(0, 1), null, ...row.slice(2)])?.name).toBe(
      'Ukjent fartøy 3450',
    )
  })

  it.each([
    ['not an array', { mmsi: 1 }],
    ['too short', [1, 2, 3]],
    ['latitude out of range', [1, 'X', 95, 6, 1, null, null, null, null, null, 1]],
    ['missing speed', [1, 'X', 60, 6, null, null, null, null, null, null, 1]],
    ['invalid speed', [1, 'X', 60, 6, 102.3, null, null, null, null, null, 1]],
    ['string coordinates', [1, 'X', '60', 6, 1, null, null, null, null, null, 1]],
  ])('rejects %s', (_, bad) => {
    expect(normalizeRow(bad)).toBeNull()
  })

  it('drops invalid course/heading', () => {
    const v = normalizeRow([1, 'X', 60, 6, 1, 360, 511, null, 0, '', 1])
    expect(v?.course).toBeNull()
    expect(v?.heading).toBeNull()
    expect(v?.length).toBeNull()
    expect(v?.destination).toBeNull()
  })
})

describe('normalizeSnapshot', () => {
  const file = { version: 1, generatedAt: '2026-11-17T12:00:00Z', vessels: [row, row, ['bad']] }

  it('parses valid rows, skips invalid and duplicates', () => {
    const s = normalizeSnapshot(file)
    expect(s.vessels).toHaveLength(1)
    expect(s.generatedAt).toBe(NOW)
  })

  it.each([
    ['null', null, 'invalid'],
    ['wrong version', { ...file, version: 2 }, 'invalid'],
    ['missing timestamp', { ...file, generatedAt: undefined }, 'invalid'],
    ['no valid vessels', { ...file, vessels: [['bad']] }, 'empty'],
  ])('throws for %s', (_, input, code) => {
    expect(() => normalizeSnapshot(input)).toThrow(AisError)
    try {
      normalizeSnapshot(input)
    } catch (e) {
      expect((e as AisError).code).toBe(code)
    }
  })
})

describe('projectPosition (dead reckoning)', () => {
  it('moves a 10 kn vessel ~1852 m in 6 minutes', () => {
    const v = vessel({ speed: 10, course: 0, timestamp: NOW })
    const p = projectPosition(v, NOW + 6 * 60_000)
    expect(distanceMeters(v, p)).toBeCloseTo(1852, -1)
    expect(p.latitude).toBeGreaterThan(v.latitude)
  })
  it('keeps stationary vessels and vessels without course in place', () => {
    const still = vessel({ speed: 0.2, timestamp: NOW })
    expect(projectPosition(still, NOW + 60_000)).toEqual({
      latitude: still.latitude,
      longitude: still.longitude,
    })
    const noCourse = vessel({ speed: 10, course: null, timestamp: NOW })
    expect(projectPosition(noCourse, NOW + 60_000).latitude).toBe(noCourse.latitude)
  })
  it('caps extrapolation for old data', () => {
    const v = vessel({ speed: 10, course: 0, timestamp: NOW })
    const capped = distanceMeters(v, projectPosition(v, NOW + MAX_PROJECTION_MS))
    expect(distanceMeters(v, projectPosition(v, NOW + 10 * MAX_PROJECTION_MS))).toBeCloseTo(
      capped,
      3,
    )
  })
})
