import { nearestToTarget } from './challenges'
import { vesselDirection } from '../services/ais/normalize'
import { CATEGORY_LABEL } from '../services/ais/shipTypes'
import type { Vessel } from '../types/vessel'
import { compassWord } from '../utils/geo'
import { formatDegrees, formatDistance, formatKnots } from '../utils/format'
import type { RoundRecord } from './engine'

/** The fact about a vessel that mattered for this challenge, e.g. "18,4 kn" or "kurs 092° (øst)". */
export function keyFact(record: RoundRecord, vessel: Vessel, at: number): string {
  const { challenge } = record
  switch (challenge.kind) {
    case 'fastest':
    case 'slowest':
    case 'speedRange':
      return formatKnots(vessel.speed)
    case 'direction':
    case 'bearing': {
      const dir = vesselDirection(vessel)
      return vessel.speed < 1 || dir === null
        ? 'ligger i ro'
        : `kurs ${formatDegrees(dir)} (${compassWord(dir)})`
    }
    case 'longest':
      return vessel.length === null ? 'ukjent lengde' : `${vessel.length} m`
    case 'cruise':
      return `${CATEGORY_LABEL[vessel.category]}${vessel.length === null ? '' : `, ${vessel.length} m`}`
    case 'category':
      return CATEGORY_LABEL[vessel.category]
    case 'closest': {
      if (!challenge.target) return ''
      const d = nearestToTarget(challenge.fleet, challenge.target, at).distances.get(vessel.id)
      return d === undefined ? '' : `${formatDistance(d)} fra bøyen`
    }
  }
}

export function vesselById(record: RoundRecord, id: string | null): Vessel | undefined {
  return id === null ? undefined : record.challenge.fleet.find((v) => v.id === id)
}

/** Short headline for the reveal card / screen reader announcement. */
export function resultHeadline(record: RoundRecord): string {
  if (record.timedOut) return 'Tiden er ute!'
  if (record.evaluation.correct)
    return record.streak >= 3 ? `Riktig – ${record.streak} på rad!` : 'Riktig!'
  return record.evaluation.accuracy >= 0.6 ? 'Nesten!' : 'Feil skip'
}
