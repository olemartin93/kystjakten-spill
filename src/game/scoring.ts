export const BASE_SCORE = 1000
export const TIME_BONUS_PER_SECOND = 25
export const MAX_ACCURACY_BONUS = 500
/** A wrong answer that was close (e.g. the 2nd fastest ship) still earns a few points. */
export const MAX_NEAR_MISS = 300

/** Score multiplier for the streak length *including* the current answer. */
export function streakMultiplier(streak: number): number {
  if (streak >= 5) return 2.5
  if (streak === 4) return 2
  if (streak === 3) return 1.5
  if (streak === 2) return 1.2
  return 1
}

export interface ScoreInput {
  correct: boolean
  /** 0–1 */
  accuracy: number
  remainingSeconds: number
  /** Streak after this answer (0 for a wrong answer). */
  streak: number
}

export interface ScoreBreakdown {
  base: number
  timeBonus: number
  accuracyBonus: number
  multiplier: number
  total: number
}

const clamp01 = (n: number): number => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0)

export function calculateScore(input: ScoreInput): ScoreBreakdown {
  const accuracy = clamp01(input.accuracy)
  if (!input.correct) {
    const accuracyBonus = Math.round(MAX_NEAR_MISS * accuracy)
    return { base: 0, timeBonus: 0, accuracyBonus, multiplier: 1, total: accuracyBonus }
  }
  const base = BASE_SCORE
  const timeBonus = Math.max(0, Math.floor(input.remainingSeconds)) * TIME_BONUS_PER_SECOND
  const accuracyBonus = Math.round(MAX_ACCURACY_BONUS * accuracy)
  const multiplier = streakMultiplier(input.streak)
  return {
    base,
    timeBonus,
    accuracyBonus,
    multiplier,
    total: Math.round((base + timeBonus + accuracyBonus) * multiplier),
  }
}
