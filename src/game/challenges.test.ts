import { describe, expect, it } from 'vitest'
import { NOW, variedPool, vessel } from '../test/fixtures'
import { destinationPoint } from '../utils/geo'
import { seededRng } from '../utils/random'
import type { BuildContext } from './challenges'
import {
  ALL_KINDS,
  CHALLENGES,
  evaluateAnswer,
  generateChallenge,
  isUnderway,
  orderKinds,
} from './challenges'
import type { Challenge } from './types'

const ctx = (seed: string, pool = variedPool()): BuildContext => ({
  rng: seededRng(seed),
  pool,
  now: NOW,
  fleetSize: 7,
  roundId: 'r1',
})

/** Build a challenge of the given kind, trying a few seeds. */
function build(kind: (typeof ALL_KINDS)[number], pool = variedPool()): Challenge {
  for (let i = 0; i < 40; i++) {
    const c = CHALLENGES[kind].build(ctx(`${kind}-${i}`, pool))
    if (c) return c
  }
  throw new Error(`could not build ${kind}`)
}

describe('challenge generation', () => {
  it.each(ALL_KINDS)('%s builds a valid round from a varied pool', (kind) => {
    const c = build(kind)
    expect(c.kind).toBe(kind)
    expect(c.fleet.length).toBeGreaterThanOrEqual(3)
    expect(c.fleet.length).toBeLessThanOrEqual(7)
    expect(c.correctIds.length).toBeGreaterThan(0)
    const fleetIds = new Set(c.fleet.map((v) => v.id))
    expect(fleetIds.size).toBe(c.fleet.length)
    for (const id of c.correctIds) expect(fleetIds.has(id)).toBe(true)
    expect(c.prompt.length).toBeGreaterThan(5)
  })

  it.each(ALL_KINDS)('%s: picking a correct vessel is correct, a wrong one is not', (kind) => {
    const c = build(kind)
    const right = c.correctIds[0] as string
    expect(evaluateAnswer(c, right, NOW).correct).toBe(true)
    const wrong = c.fleet.find((v) => !c.correctIds.includes(v.id))
    if (wrong) {
      const e = evaluateAnswer(c, wrong.id, NOW)
      expect(e.correct).toBe(false)
      expect(e.accuracy).toBeGreaterThanOrEqual(0)
      expect(e.accuracy).toBeLessThan(1)
    }
  })

  it('fastest: the correct answer is the vessel with the highest speed', () => {
    const c = build('fastest')
    const max = Math.max(...c.fleet.map((v) => v.speed))
    for (const id of c.correctIds)
      expect(c.fleet.find((v) => v.id === id)?.speed).toBeGreaterThanOrEqual(max - 0.3)
  })

  it('fastest: the second fastest earns partial accuracy', () => {
    const pool = [
      vessel({ speed: 20 }),
      vessel({ speed: 15 }),
      vessel({ speed: 5 }),
      vessel({ speed: 4 }),
    ]
    const c = build('fastest', pool)
    const second = c.fleet.find((v) => v.speed === 15)
    expect(second).toBeDefined()
    expect(evaluateAnswer(c, second?.id ?? '', NOW).accuracy).toBeCloseTo(0.75)
  })

  it('slowest only uses vessels that are under way', () => {
    const c = build('slowest')
    expect(c.fleet.every(isUnderway)).toBe(true)
  })

  it('direction: every correct vessel travels within 30° of the asked direction', () => {
    const c = build('direction')
    const dir = c.params.direction ?? -1
    for (const id of c.correctIds) {
      const v = c.fleet.find((x) => x.id === id)
      const diff = Math.abs((((v?.course ?? 0) - dir + 540) % 360) - 180)
      expect(diff).toBeLessThanOrEqual(30)
    }
  })

  it('category: correct ids are exactly the fleet vessels of that category', () => {
    const c = build('category')
    const expected = c.fleet.filter((v) => v.category === c.params.category).map((v) => v.id)
    expect([...c.correctIds].sort()).toEqual([...expected].sort())
  })

  it('cruise requires a passenger vessel of at least 100 m', () => {
    const c = build('cruise')
    for (const id of c.correctIds) {
      const v = c.fleet.find((x) => x.id === id)
      expect(v?.category).toBe('passenger')
      expect(v?.length ?? 0).toBeGreaterThanOrEqual(100)
    }
    const noCruise = variedPool().filter((v) => v.category !== 'passenger')
    expect(CHALLENGES.cruise.build(ctx('x', noCruise))).toBeNull()
  })

  it('speedRange: correct vessels are inside the band', () => {
    const c = build('speedRange')
    const { minSpeed = 0, maxSpeed = 0 } = c.params
    for (const id of c.correctIds) {
      const v = c.fleet.find((x) => x.id === id)
      expect(v?.speed).toBeGreaterThanOrEqual(minSpeed)
      expect(v?.speed).toBeLessThanOrEqual(maxSpeed)
    }
  })

  it('closest: answer is re-evaluated with the target at answer time', () => {
    const c = build('closest')
    expect(c.target).not.toBeNull()
    const e = evaluateAnswer(c, c.correctIds[0] as string, NOW)
    expect(e.correct).toBe(true)
  })

  it('closest: a vessel sailing onto the target becomes the right answer', () => {
    const target = { latitude: 62.5, longitude: 6.2 }
    const stillNear = vessel({ ...destinationPoint(target, 0, 600), speed: 0, course: null })
    // 20 kn towards the target from 2 km south: ~1 km after 100 s → closer than the stationary ship at 600 m
    const start = destinationPoint(target, 180, 2000)
    const mover = vessel({ ...start, speed: 20, course: 0, timestamp: NOW })
    const far = vessel({ ...destinationPoint(target, 90, 5000), speed: 0, course: null })
    const challenge: Challenge = {
      id: 't',
      kind: 'closest',
      title: '',
      prompt: '',
      hint: '',
      fleet: [stillNear, mover, far],
      correctIds: [stillNear.id],
      target,
      params: {},
    }
    expect(evaluateAnswer(challenge, stillNear.id, NOW).correct).toBe(true)
    expect(evaluateAnswer(challenge, mover.id, NOW + 150_000).correct).toBe(true)
  })

  it('longest needs a clear winner', () => {
    const same = [1, 2, 3, 4, 5].map(() => vessel({ length: 100 }))
    expect(CHALLENGES.longest.build(ctx('l', same))).toBeNull()
  })

  it('generateChallenge returns null for an empty pool and falls back between kinds', () => {
    expect(generateChallenge(ctx('e', []), ['fastest'])).toBeNull()
    const onlyStationary = [1, 2, 3, 4, 5, 6].map((i) =>
      vessel({ speed: 0, course: null, heading: null, shipType: i % 2 ? 70 : 30, length: 20 * i }),
    )
    const c = generateChallenge(ctx('f', onlyStationary), ['fastest', 'slowest'])
    expect(c).not.toBeNull()
    expect(['fastest', 'slowest']).not.toContain(c?.kind)
  })

  it('orderKinds returns every kind once and never starts with the previous kind', () => {
    for (let i = 0; i < 25; i++) {
      const order = orderKinds(seededRng(`o${i}`), 'fastest')
      expect(order[0]).not.toBe('fastest')
      expect([...order].sort()).toEqual([...ALL_KINDS].sort())
    }
  })
})
