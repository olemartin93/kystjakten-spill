import { describe, expect, it } from 'vitest'
import { hashString, seededRng, shuffle } from './random'

describe('seeded randomness', () => {
  it('hashString is stable', () => {
    expect(hashString('2026-11-17')).toBe(hashString('2026-11-17'))
    expect(hashString('2026-11-17')).not.toBe(hashString('2026-11-18'))
  })
  it('produces the same sequence for the same seed', () => {
    const a = seededRng('x')
    const b = seededRng('x')
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })
  it('values are within [0, 1)', () => {
    const r = seededRng('range')
    for (let i = 0; i < 1000; i++) {
      const v = r()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
  it('shuffle keeps all items and does not mutate input', () => {
    const input = [1, 2, 3, 4, 5, 6]
    const out = shuffle(seededRng('s'), input)
    expect([...out].sort()).toEqual(input)
    expect(input).toEqual([1, 2, 3, 4, 5, 6])
  })
})
