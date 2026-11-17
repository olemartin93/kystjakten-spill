import { describe, expect, it } from 'vitest'
import { NOW, vessel } from '../test/fixtures'
import { distanceMeters } from '../utils/geo'
import { boundsOf, fleetFeatures, ringFeatures, vectorFeatures } from './features'

describe('map features', () => {
  it('marks stationary vessels with a separate icon and no vector', () => {
    const moving = vessel({ speed: 10, course: 90, shipType: 70 })
    const still = vessel({ speed: 0, course: null, shipType: 30 })
    const fc = fleetFeatures(
      [
        { vessel: moving, letter: 'A', state: 'idle' },
        { vessel: still, letter: 'B', state: 'selected' },
      ],
      NOW,
    )
    expect(fc.features.map((f) => f.properties?.icon as string)).toEqual([
      'ship-cargo',
      'ship-fishing-still',
    ])
    expect(fc.features[0]?.properties?.dir).toBe(90)
    expect(vectorFeatures([moving, still], NOW).features).toHaveLength(1)
  })

  it('a 10 kn speed vector is one nautical mile long (6 minutes)', () => {
    const v = vessel({ speed: 10, course: 0 })
    const [from, to] = vectorFeatures([v], NOW).features[0]?.geometry.coordinates ?? []
    const d = distanceMeters(
      { longitude: from?.[0] ?? 0, latitude: from?.[1] ?? 0 },
      { longitude: to?.[0] ?? 0, latitude: to?.[1] ?? 0 },
    )
    expect(d).toBeCloseTo(1852, -1)
  })

  it('builds range rings and bounds', () => {
    expect(ringFeatures({ latitude: 62, longitude: 6 }, 3).features).toHaveLength(3)
    expect(ringFeatures(null).features).toHaveLength(0)
    expect(boundsOf([])).toBeNull()
    expect(
      boundsOf([
        { latitude: 1, longitude: 5 },
        { latitude: 3, longitude: 2 },
      ]),
    ).toEqual([
      [2, 1],
      [5, 3],
    ])
  })
})
