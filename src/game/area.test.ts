import { describe, expect, it } from 'vitest'
import { NOW, vessel } from '../test/fixtures'
import { destinationPoint } from '../utils/geo'
import { findPlayArea, HARBOURS, localCluster, MIN_POOL, vesselsNear } from './area'

const bergen = HARBOURS.find((h) => h.id === 'bergen')?.center ?? { latitude: 60.4, longitude: 5.3 }

describe('play area', () => {
  it('filters vessels by distance and sorts nearest first', () => {
    const center = { latitude: 62.47, longitude: 6.15 }
    const near = vessel({ ...destinationPoint(center, 0, 1000), speed: 0 })
    const mid = vessel({ ...destinationPoint(center, 90, 5000), speed: 0 })
    const far = vessel({ ...destinationPoint(center, 180, 50_000), speed: 0 })
    expect(vesselsNear([far, mid, near], center, 10_000, NOW).map((v) => v.id)).toEqual([
      near.id,
      mid.id,
    ])
  })

  it('uses the player location when enough vessels are nearby', () => {
    const center = { latitude: 62.47, longitude: 6.15 }
    const fleet = Array.from({ length: MIN_POOL + 2 }, (_, i) =>
      vessel({ ...destinationPoint(center, i * 30, 2000 + i * 100), speed: 0 }),
    )
    const area = findPlayArea(fleet, center, NOW)
    expect(area?.relocatedTo).toBeNull()
    expect(area?.pool).toHaveLength(MIN_POOL + 2)
  })

  it('relocates an inland player to the nearest busy harbour', () => {
    const inland = { latitude: 61.5, longitude: 9.5 } // Jotunheimen
    const fleet = Array.from({ length: MIN_POOL }, (_, i) =>
      vessel({ ...destinationPoint(bergen, i * 36, 3000), speed: 0 }),
    )
    const area = findPlayArea(fleet, inland, NOW)
    expect(area?.relocatedTo?.id).toBe('bergen')
  })

  it('returns null when there are no vessels anywhere', () => {
    expect(findPlayArea([], bergen, NOW)).toBeNull()
  })
})

describe('localCluster', () => {
  it('keeps a round within one patch of sea', () => {
    const a = { latitude: 62.47, longitude: 6.15 }
    const b = { latitude: 62.9, longitude: 7.5 } // ~80 km away
    const near = Array.from({ length: 12 }, (_, i) =>
      vessel({ ...destinationPoint(a, i * 30, 500 + i * 300), speed: 0 }),
    )
    const far = Array.from({ length: 12 }, (_, i) =>
      vessel({ ...destinationPoint(b, i * 30, 500 + i * 300), speed: 0 }),
    )
    const cluster = localCluster([...near, ...far], near[0] ?? vessel(), NOW)
    expect(cluster.every((v) => near.includes(v))).toBe(true)
  })

  it('falls back to the nearest vessels when the anchor is isolated', () => {
    const lonely = vessel({ latitude: 70, longitude: 20, speed: 0 })
    const others = Array.from({ length: 10 }, () =>
      vessel({ latitude: 62.5, longitude: 6.2, speed: 0 }),
    )
    expect(localCluster([lonely, ...others], lonely, NOW)).toHaveLength(11)
  })
})
