import { osloDateKey } from '../utils/date'
import type { Rng } from '../utils/random'
import { seededRng, shuffle } from '../utils/random'
import type { Harbour } from './area'
import { DEFAULT_HARBOUR, HARBOURS } from './area'
import { ALL_KINDS } from './challenges'
import type { ChallengeKind } from './types'
import type { Vessel } from '../types/vessel'

export interface DailyPlan {
  dateKey: string
  seed: string
  harbour: Harbour
  kinds: ChallengeKind[]
}

/** Everything about today's challenge that can be decided from the date alone. */
export function dailyPlan(dateKey: string = osloDateKey(), rounds = 5): DailyPlan {
  const seed = `fyrvakt-daily-${dateKey}`
  const rng = seededRng(seed)
  const harbour = HARBOURS[Math.floor(rng() * HARBOURS.length)] ?? DEFAULT_HARBOUR
  const kinds = shuffle(rng, ALL_KINDS).slice(0, rounds)
  return { dateKey, seed, harbour, kinds }
}

/** Per-round RNG so round N is identical for everyone, regardless of what happened in earlier rounds. */
export const dailyRoundRng = (plan: DailyPlan, round: number): Rng =>
  seededRng(`${plan.seed}#${round}`)

/** Canonical ordering so a seeded pick from the same data gives the same fleet for everyone. */
export const canonicalPool = (pool: Vessel[]): Vessel[] => [...pool].sort((a, b) => a.mmsi - b.mmsi)
