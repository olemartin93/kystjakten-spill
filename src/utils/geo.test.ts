import { describe, expect, it } from 'vitest'
import {
  angleDifference,
  bearingDegrees,
  compassPoint,
  compassWord,
  destinationPoint,
  distanceMeters,
  normalizeAngle,
} from './geo'

const alesund = { latitude: 62.4722, longitude: 6.1495 }
const bergen = { latitude: 60.3913, longitude: 5.3221 }

describe('distanceMeters', () => {
  it('is zero for the same point', () => {
    expect(distanceMeters(alesund, alesund)).toBe(0)
  })
  it('matches the known Ålesund–Bergen distance (~236 km)', () => {
    expect(distanceMeters(alesund, bergen) / 1000).toBeCloseTo(236, -1)
  })
  it('one minute of latitude is about one nautical mile', () => {
    const d = distanceMeters(
      { latitude: 60, longitude: 5 },
      { latitude: 60 + 1 / 60, longitude: 5 },
    )
    expect(d).toBeGreaterThan(1840)
    expect(d).toBeLessThan(1865)
  })
})

describe('bearings and headings', () => {
  it('normalizes angles', () => {
    expect(normalizeAngle(-90)).toBe(270)
    expect(normalizeAngle(725)).toBe(5)
  })
  it('computes the smallest angle difference across north', () => {
    expect(angleDifference(350, 10)).toBe(20)
    expect(angleDifference(10, 350)).toBe(20)
    expect(angleDifference(0, 180)).toBe(180)
    expect(angleDifference(90, 270)).toBe(180)
  })
  it('bearing due north/east', () => {
    expect(bearingDegrees(alesund, { ...alesund, latitude: 63 })).toBeCloseTo(0, 5)
    expect(
      bearingDegrees({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 }),
    ).toBeCloseTo(90, 5)
  })
  it('destinationPoint round-trips with distance and bearing', () => {
    const p = destinationPoint(alesund, 135, 5000)
    expect(distanceMeters(alesund, p)).toBeCloseTo(5000, 0)
    expect(bearingDegrees(alesund, p)).toBeCloseTo(135, 0)
  })
  it('names compass points in Norwegian', () => {
    expect(compassPoint(0)).toBe('N')
    expect(compassPoint(44)).toBe('NØ')
    expect(compassPoint(181)).toBe('S')
    expect(compassPoint(359)).toBe('N')
    expect(compassWord(270)).toBe('vest')
  })
})
