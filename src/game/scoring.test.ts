import { describe, expect, it } from 'vitest'
import { BASE_SCORE, calculateScore, MAX_NEAR_MISS, streakMultiplier } from './scoring'

describe('streakMultiplier', () => {
  it.each([
    [0, 1],
    [1, 1],
    [2, 1.2],
    [3, 1.5],
    [4, 2],
    [5, 2.5],
    [12, 2.5],
  ])('streak %i → x%f', (streak, expected) => {
    expect(streakMultiplier(streak)).toBe(expected)
  })
})

describe('calculateScore', () => {
  it('awards base + time bonus (25/s) + accuracy bonus for a correct answer', () => {
    const s = calculateScore({ correct: true, accuracy: 1, remainingSeconds: 12.9, streak: 1 })
    expect(s.base).toBe(BASE_SCORE)
    expect(s.timeBonus).toBe(12 * 25)
    expect(s.accuracyBonus).toBe(500)
    expect(s.total).toBe(1800)
  })

  it('applies the streak multiplier to the whole round score', () => {
    const s = calculateScore({ correct: true, accuracy: 1, remainingSeconds: 10, streak: 3 })
    expect(s.multiplier).toBe(1.5)
    expect(s.total).toBe(Math.round((1000 + 250 + 500) * 1.5))
  })

  it('gives only a small near-miss bonus for a wrong answer', () => {
    const s = calculateScore({ correct: false, accuracy: 0.5, remainingSeconds: 20, streak: 0 })
    expect(s).toEqual({
      base: 0,
      timeBonus: 0,
      accuracyBonus: MAX_NEAR_MISS / 2,
      multiplier: 1,
      total: 150,
    })
  })

  it('clamps nonsense input', () => {
    const s = calculateScore({ correct: true, accuracy: 7, remainingSeconds: -3, streak: 1 })
    expect(s.timeBonus).toBe(0)
    expect(s.accuracyBonus).toBe(500)
    expect(
      calculateScore({ correct: false, accuracy: Number.NaN, remainingSeconds: 0, streak: 0 })
        .total,
    ).toBe(0)
  })
})
