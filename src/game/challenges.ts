import { projectPosition, vesselDirection } from '../services/ais/normalize'
import { CATEGORY_LABEL } from '../services/ais/shipTypes'
import type { LatLng, Vessel, VesselCategory } from '../types/vessel'
import { angleDifference, compassPoint, destinationPoint, distanceMeters } from '../utils/geo'
import type { Rng } from '../utils/random'
import { pickOne, randomInt, shuffle } from '../utils/random'
import type { Challenge, ChallengeKind, ChallengeParams, Evaluation } from './types'

export interface BuildContext {
  rng: Rng
  /** Candidate vessels near the play area, already validated. */
  pool: Vessel[]
  now: number
  fleetSize: number
  roundId: string
}

interface ChallengeDefinition {
  kind: ChallengeKind
  weight: number
  build(ctx: BuildContext): Challenge | null
  evaluate(challenge: Challenge, pickedId: string, now: number): Evaluation
}

/** Minimum speed (knots) for a vessel to count as "under way" in movement challenges. */
export const UNDERWAY_KNOTS = 1
const TIE_KNOTS = 0.3

export const isUnderway = (v: Vessel): boolean =>
  v.speed >= UNDERWAY_KNOTS && vesselDirection(v) !== null

const byId = (fleet: Vessel[], id: string): Vessel | undefined => fleet.find((v) => v.id === id)

/** Combine correct vessels and distractors into a shuffled fleet of at most `size`. */
function composeFleet(
  rng: Rng,
  correct: Vessel[],
  distractors: Vessel[],
  size: number,
  maxCorrect = 2,
): Vessel[] {
  const chosenCorrect = shuffle(rng, correct).slice(
    0,
    Math.max(1, Math.min(maxCorrect, correct.length)),
  )
  const chosenOthers = shuffle(rng, distractors).slice(0, size - chosenCorrect.length)
  return shuffle(rng, [...chosenCorrect, ...chosenOthers])
}

function make(
  ctx: BuildContext,
  kind: ChallengeKind,
  text: { title: string; prompt: string; hint: string },
  fleet: Vessel[],
  correctIds: string[],
  params: ChallengeParams = {},
  target: LatLng | null = null,
): Challenge {
  return { id: `${ctx.roundId}-${kind}`, kind, ...text, fleet, correctIds, params, target }
}

const setEvaluation = (
  challenge: Challenge,
  pickedId: string,
  partial: (v: Vessel) => number,
): Evaluation => {
  const correct = challenge.correctIds.includes(pickedId)
  const picked = byId(challenge.fleet, pickedId)
  return {
    correct,
    accuracy: correct ? 1 : picked ? Math.max(0, Math.min(0.99, partial(picked))) : 0,
    correctIds: challenge.correctIds,
  }
}

const fastest: ChallengeDefinition = {
  kind: 'fastest',
  weight: 3,
  build(ctx) {
    const movers = ctx.pool.filter(isUnderway)
    if (movers.length < 3) return null
    const stationary = ctx.pool.filter((v) => !isUnderway(v))
    const fleet = shuffle(ctx.rng, [
      ...shuffle(ctx.rng, movers).slice(0, ctx.fleetSize - 1),
      ...shuffle(ctx.rng, stationary).slice(0, 1),
    ]).slice(0, ctx.fleetSize)
    const max = Math.max(...fleet.map((v) => v.speed))
    if (max < 4) return null
    const correct = fleet.filter((v) => v.speed >= max - TIE_KNOTS).map((v) => v.id)
    return make(
      ctx,
      'fastest',
      {
        title: 'Raskest',
        prompt: 'Finn skipet som går raskest',
        hint: 'Lengst fartsvektor = høyest fart.',
      },
      fleet,
      correct,
    )
  },
  evaluate(challenge, pickedId) {
    const max = Math.max(...challenge.fleet.map((v) => v.speed))
    return setEvaluation(challenge, pickedId, (v) => (max > 0 ? v.speed / max : 0))
  },
}

const slowest: ChallengeDefinition = {
  kind: 'slowest',
  weight: 2,
  build(ctx) {
    const movers = ctx.pool.filter(isUnderway)
    if (movers.length < 4) return null
    const fleet = shuffle(ctx.rng, movers).slice(0, ctx.fleetSize)
    const speeds = fleet.map((v) => v.speed)
    const min = Math.min(...speeds)
    if (Math.max(...speeds) - min < 3) return null
    const correct = fleet.filter((v) => v.speed <= min + TIE_KNOTS).map((v) => v.id)
    return make(
      ctx,
      'slowest',
      {
        title: 'Saktest',
        prompt: 'Finn skipet som går saktest',
        hint: 'Alle skipene er i fart. Kortest fartsvektor vinner.',
      },
      fleet,
      correct,
    )
  },
  evaluate(challenge, pickedId) {
    const min = Math.min(...challenge.fleet.map((v) => v.speed))
    return setEvaluation(challenge, pickedId, (v) => (v.speed > 0 ? min / v.speed : 0))
  },
}

/** Ids of the vessel(s) nearest the target at time `now`, plus each vessel's distance. */
export function nearestToTarget(
  fleet: Vessel[],
  target: LatLng,
  now: number,
): { ids: string[]; distances: Map<string, number> } {
  const distances = new Map<string, number>()
  for (const v of fleet) distances.set(v.id, distanceMeters(projectPosition(v, now), target))
  const min = Math.min(...distances.values())
  // Within 25 m counts as a tie – well below what anyone can distinguish on a phone.
  const ids = [...distances.entries()].filter(([, d]) => d <= min + 25).map(([id]) => id)
  return { ids, distances }
}

const closest: ChallengeDefinition = {
  kind: 'closest',
  weight: 3,
  build(ctx) {
    if (ctx.pool.length < 4) return null
    const fleet = shuffle(ctx.rng, ctx.pool).slice(0, ctx.fleetSize)
    for (let attempt = 0; attempt < 6; attempt++) {
      const anchor = pickOne(ctx.rng, fleet)
      if (!anchor) return null
      const target = destinationPoint(
        projectPosition(anchor, ctx.now),
        randomInt(ctx.rng, 0, 359),
        400 + ctx.rng() * 1600,
      )
      const sorted = fleet
        .map((v) => distanceMeters(projectPosition(v, ctx.now), target))
        .sort((a, b) => a - b)
      const [first, second] = sorted
      if (first === undefined || second === undefined) return null
      // Require a clear winner so the round is fair even while ships move.
      if (second - first < Math.max(250, first * 0.25)) continue
      const { ids } = nearestToTarget(fleet, target, ctx.now)
      return make(
        ctx,
        'closest',
        {
          title: 'Nærmest bøyen',
          prompt: 'Finn skipet som er nærmest den gule bøyen',
          hint: 'Ringene rundt bøyen er 1 nautisk mil fra hverandre.',
        },
        fleet,
        ids,
        {},
        target,
      )
    }
    return null
  },
  evaluate(challenge, pickedId, now) {
    if (!challenge.target) return { correct: false, accuracy: 0, correctIds: [] }
    const { ids, distances } = nearestToTarget(challenge.fleet, challenge.target, now)
    const min = Math.min(...distances.values())
    const picked = distances.get(pickedId)
    const correct = ids.includes(pickedId)
    const accuracy = correct
      ? 1
      : picked !== undefined && picked > 0
        ? Math.min(0.99, min / picked)
        : 0
    return { correct, accuracy, correctIds: ids }
  },
}

const DIRECTIONS: { deg: number; word: string }[] = [
  { deg: 0, word: 'nordover' },
  { deg: 90, word: 'østover' },
  { deg: 180, word: 'sørover' },
  { deg: 270, word: 'vestover' },
]
const DIRECTION_TOLERANCE = 30
const DIRECTION_DISTRACTOR_MIN = 60

const direction: ChallengeDefinition = {
  kind: 'direction',
  weight: 3,
  build(ctx) {
    for (const dir of shuffle(ctx.rng, DIRECTIONS)) {
      const diff = (v: Vessel): number => angleDifference(vesselDirection(v) ?? 0, dir.deg)
      const correct = ctx.pool.filter((v) => isUnderway(v) && diff(v) <= DIRECTION_TOLERANCE)
      const distractors = ctx.pool.filter(
        (v) => !isUnderway(v) || diff(v) >= DIRECTION_DISTRACTOR_MIN,
      )
      if (correct.length < 1 || distractors.length < 3) continue
      const fleet = composeFleet(ctx.rng, correct, distractors, ctx.fleetSize)
      const ids = fleet
        .filter((v) => isUnderway(v) && diff(v) <= DIRECTION_TOLERANCE)
        .map((v) => v.id)
      return make(
        ctx,
        'direction',
        {
          title: `Kurs ${dir.word}`,
          prompt: `Finn skipet som går ${dir.word}`,
          hint: 'Skipssymbolet peker i fartsretningen. Nord er opp.',
        },
        fleet,
        ids,
        { direction: dir.deg },
      )
    }
    return null
  },
  evaluate(challenge, pickedId) {
    const target = challenge.params.direction ?? 0
    const picked = byId(challenge.fleet, pickedId)
    const correct = challenge.correctIds.includes(pickedId)
    if (!picked || !isUnderway(picked))
      return { correct, accuracy: 0, correctIds: challenge.correctIds }
    const d = angleDifference(vesselDirection(picked) ?? 0, target)
    const accuracy = correct
      ? 1 - (d / DIRECTION_TOLERANCE) * 0.25
      : Math.max(0, Math.cos((d * Math.PI) / 180)) * 0.9
    return { correct, accuracy, correctIds: challenge.correctIds }
  },
}

const bearing: ChallengeDefinition = {
  kind: 'bearing',
  weight: 2,
  build(ctx) {
    const movers = ctx.pool.filter(isUnderway)
    if (movers.length < 4) return null
    for (let attempt = 0; attempt < 6; attempt++) {
      const course = randomInt(ctx.rng, 0, 71) * 5
      const diff = (v: Vessel): number => angleDifference(vesselDirection(v) ?? 0, course)
      const sorted = [...movers].sort((a, b) => diff(a) - diff(b))
      const best = sorted[0]
      if (!best || diff(best) > 25) continue
      const distractors = ctx.pool.filter((v) => !isUnderway(v) || diff(v) >= diff(best) + 20)
      if (distractors.length < 3) continue
      const fleet = composeFleet(ctx.rng, [best], distractors, ctx.fleetSize, 1)
      const label = `${String(course).padStart(3, '0')}° (${compassPoint(course)})`
      return make(
        ctx,
        'bearing',
        {
          title: `Kurs ${label}`,
          prompt: `Finn skipet med kurs nærmest ${label}`,
          hint: 'Kursen er retningen skipet beveger seg. 090° er øst, 180° er sør.',
        },
        fleet,
        [best.id],
        { direction: course },
      )
    }
    return null
  },
  evaluate(challenge, pickedId) {
    const target = challenge.params.direction ?? 0
    return setEvaluation(challenge, pickedId, (v) =>
      isUnderway(v) ? 1 - angleDifference(vesselDirection(v) ?? 0, target) / 180 : 0,
    )
  },
}

const CATEGORY_PROMPT: Partial<Record<VesselCategory, string>> = {
  cargo: 'Finn lasteskipet',
  tanker: 'Finn tankskipet',
  fishing: 'Finn fiskefartøyet',
  passenger: 'Finn passasjerskipet',
  highspeed: 'Finn hurtigbåten',
  tug: 'Finn slepebåten',
  pleasure: 'Finn fritidsbåten',
  sailing: 'Finn seilbåten',
}

const category: ChallengeDefinition = {
  kind: 'category',
  weight: 2,
  build(ctx) {
    const options = shuffle(ctx.rng, Object.keys(CATEGORY_PROMPT) as VesselCategory[])
    for (const cat of options) {
      const correct = ctx.pool.filter((v) => v.category === cat)
      const distractors = ctx.pool.filter((v) => v.category !== cat)
      if (correct.length < 1 || distractors.length < 3) continue
      const fleet = composeFleet(ctx.rng, correct, distractors, ctx.fleetSize)
      return make(
        ctx,
        'category',
        {
          title: CATEGORY_LABEL[cat],
          prompt: CATEGORY_PROMPT[cat] ?? `Finn ${CATEGORY_LABEL[cat].toLowerCase()}`,
          hint: 'Fargen på symbolet viser skipstypen. Trykk på et skip for å se typen.',
        },
        fleet,
        fleet.filter((v) => v.category === cat).map((v) => v.id),
        { category: cat },
      )
    }
    return null
  },
  evaluate(challenge, pickedId) {
    return setEvaluation(challenge, pickedId, () => 0)
  },
}

export const CRUISE_MIN_LENGTH = 100
const isBigPassenger = (v: Vessel): boolean =>
  v.category === 'passenger' && (v.length ?? 0) >= CRUISE_MIN_LENGTH

const cruise: ChallengeDefinition = {
  kind: 'cruise',
  weight: 2,
  build(ctx) {
    const correct = ctx.pool.filter(isBigPassenger)
    // Tricky distractors: other big ships and small passenger boats.
    const distractors = ctx.pool.filter((v) => !isBigPassenger(v))
    if (correct.length < 1 || distractors.length < 3) return null
    const big = distractors.filter((v) => (v.length ?? 0) >= 60)
    const rest = distractors.filter((v) => (v.length ?? 0) < 60)
    const ordered = [...shuffle(ctx.rng, big), ...shuffle(ctx.rng, rest)].slice(
      0,
      ctx.fleetSize - 1,
    )
    const fleet = shuffle(ctx.rng, [...shuffle(ctx.rng, correct).slice(0, 1), ...ordered])
    return make(
      ctx,
      'cruise',
      {
        title: 'Cruise & ferje',
        prompt: `Finn cruiseskipet eller den store ferja (over ${CRUISE_MIN_LENGTH} m)`,
        hint: 'Store skip har større symbol, og passasjerskip er rosa.',
      },
      fleet,
      fleet.filter(isBigPassenger).map((v) => v.id),
    )
  },
  evaluate(challenge, pickedId) {
    return setEvaluation(challenge, pickedId, (v) => (v.category === 'passenger' ? 0.4 : 0))
  },
}

const SPEED_BANDS = [2, 5, 8, 10, 12, 14, 18]
const BAND_WIDTH = 4
const BAND_MARGIN = 1.5

const speedRange: ChallengeDefinition = {
  kind: 'speedRange',
  weight: 2,
  build(ctx) {
    for (const lo of shuffle(ctx.rng, SPEED_BANDS)) {
      const hi = lo + BAND_WIDTH
      const correct = ctx.pool.filter((v) => isUnderway(v) && v.speed >= lo && v.speed <= hi)
      const distractors = ctx.pool.filter(
        (v) => v.speed < lo - BAND_MARGIN || v.speed > hi + BAND_MARGIN,
      )
      if (correct.length < 1 || distractors.length < 3) continue
      const fleet = composeFleet(ctx.rng, correct, distractors, ctx.fleetSize, 1)
      return make(
        ctx,
        'speedRange',
        {
          title: `${lo}–${hi} knop`,
          prompt: `Finn skipet som går mellom ${lo} og ${hi} knop`,
          hint: 'Fartsvektoren viser 6 minutter: 10 knop = 1 nautisk mil = én ring.',
        },
        fleet,
        fleet.filter((v) => v.speed >= lo && v.speed <= hi).map((v) => v.id),
        { minSpeed: lo, maxSpeed: hi },
      )
    }
    return null
  },
  evaluate(challenge, pickedId) {
    const lo = challenge.params.minSpeed ?? 0
    const hi = challenge.params.maxSpeed ?? 0
    return setEvaluation(challenge, pickedId, (v) => {
      const off = v.speed < lo ? lo - v.speed : v.speed - hi
      return 1 - off / 8
    })
  },
}

const longest: ChallengeDefinition = {
  kind: 'longest',
  weight: 2,
  build(ctx) {
    const known = ctx.pool.filter((v) => v.length !== null)
    if (known.length < 4) return null
    const fleet = shuffle(ctx.rng, known).slice(0, ctx.fleetSize)
    const lengths = fleet.map((v) => v.length ?? 0).sort((a, b) => b - a)
    const [max, second] = lengths
    if (max === undefined || second === undefined || max - second < 15) return null
    return make(
      ctx,
      'longest',
      {
        title: 'Størst',
        prompt: 'Finn det lengste skipet',
        hint: 'Symbolstørrelsen følger skipets lengde.',
      },
      fleet,
      fleet.filter((v) => (v.length ?? 0) >= max - 3).map((v) => v.id),
    )
  },
  evaluate(challenge, pickedId) {
    const max = Math.max(...challenge.fleet.map((v) => v.length ?? 0))
    return setEvaluation(challenge, pickedId, (v) => (max > 0 ? (v.length ?? 0) / max : 0))
  },
}

export const CHALLENGES: Record<ChallengeKind, ChallengeDefinition> = {
  fastest,
  slowest,
  closest,
  direction,
  bearing,
  category,
  cruise,
  speedRange,
  longest,
}

export const ALL_KINDS = Object.keys(CHALLENGES) as ChallengeKind[]

/** Weighted random ordering of challenge kinds, avoiding an immediate repeat of `previous`. */
export function orderKinds(rng: Rng, previous: ChallengeKind | null): ChallengeKind[] {
  const remaining = ALL_KINDS.filter((k) => k !== previous)
  const ordered: ChallengeKind[] = []
  while (remaining.length > 0) {
    const total = remaining.reduce((sum, k) => sum + CHALLENGES[k].weight, 0)
    let roll = rng() * total
    let index = 0
    for (; index < remaining.length - 1; index++) {
      roll -= CHALLENGES[remaining[index] as ChallengeKind].weight
      if (roll < 0) break
    }
    ordered.push(...remaining.splice(index, 1))
  }
  if (previous) ordered.push(previous)
  return ordered
}

/**
 * Build a playable challenge. Tries the preferred kinds first, then any kind in order.
 * Returns null when the pool cannot support any challenge.
 */
export function generateChallenge(ctx: BuildContext, preferred: ChallengeKind[]): Challenge | null {
  const tried = new Set<ChallengeKind>()
  for (const kind of [...preferred, ...ALL_KINDS]) {
    if (tried.has(kind)) continue
    tried.add(kind)
    const challenge = CHALLENGES[kind].build(ctx)
    if (challenge && challenge.fleet.length >= 3 && challenge.correctIds.length > 0)
      return challenge
  }
  return null
}

export function evaluateAnswer(challenge: Challenge, pickedId: string, now: number): Evaluation {
  return CHALLENGES[challenge.kind].evaluate(challenge, pickedId, now)
}
