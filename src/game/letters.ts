import { FLEET_LETTERS } from '../map/icons'
import type { Vessel } from '../types/vessel'

/** Letters A, B, C… assigned west → east so the list order matches what players see on the map. */
export function assignLetters(fleet: Vessel[]): Map<string, string> {
  const sorted = [...fleet].sort((a, b) => a.longitude - b.longitude || a.mmsi - b.mmsi)
  return new Map(sorted.map((v, i) => [v.id, FLEET_LETTERS[i] ?? String(i + 1)]))
}
