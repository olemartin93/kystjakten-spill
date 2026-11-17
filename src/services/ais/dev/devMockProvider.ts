/**
 * DEVELOPMENT ONLY – simulated vessels for working on the UI without network access.
 * Loaded exclusively via `npm run dev:mock` (Vite mode "mock"); never part of production builds.
 */
import type { AisSnapshot, Vessel } from '../../../types/vessel'
import { createRng, randomInt } from '../../../utils/random'
import type { AisProvider } from '../provider'
import { categoryForShipType } from '../shipTypes'

const NAMES = [
  'SIMULERT NORDLYS',
  'SIMULERT HAVBRIS',
  'SIMULERT FJORDGLIMT',
  'SIMULERT SKARVEN',
  'SIMULERT STORMSVALE',
  'SIMULERT KYSTLYS',
  'SIMULERT TERNEN',
  'SIMULERT ÆGIR',
  'SIMULERT BØLGEN',
  'SIMULERT SULA',
  'SIMULERT REVET',
  'SIMULERT LUNDEN',
]
const TYPES = [60, 70, 80, 30, 52, 40, 36, 37, 69, 79, 30, 70]

/** Rough water areas around Ålesund (lat, lon) so mock boats don't sit on land. */
const WATER: [number, number][] = [
  [62.48, 6.05],
  [62.46, 6.25],
  [62.52, 6.35],
  [62.43, 5.95],
  [62.56, 6.1],
  [62.4, 6.2],
  [62.5, 5.85],
  [62.6, 6.3],
]

export function createDevMockProvider(): AisProvider {
  return {
    name: 'dev-mock',
    fetchSnapshot() {
      const rng = createRng(Math.floor(Date.now() / 600_000))
      const now = Date.now()
      const vessels: Vessel[] = Array.from({ length: 40 }, (_, i) => {
        const base = WATER[i % WATER.length] ?? [62.47, 6.15]
        const type = TYPES[i % TYPES.length] ?? 70
        const speed = rng() < 0.15 ? 0 : Math.round(rng() * 220) / 10
        const course = randomInt(rng, 0, 359)
        return {
          id: String(257_000_000 + i),
          mmsi: 257_000_000 + i,
          name: `${NAMES[i % NAMES.length] ?? 'SIMULERT'} ${Math.floor(i / NAMES.length) + 1}`,
          latitude: base[0] + (rng() - 0.5) * 0.05,
          longitude: base[1] + (rng() - 0.5) * 0.12,
          speed,
          course,
          heading: course,
          shipType: type,
          category: categoryForShipType(type),
          length: randomInt(rng, 12, 290),
          destination: 'ÅLESUND',
          timestamp: now - randomInt(rng, 0, 300) * 1000,
        }
      })
      const snapshot: AisSnapshot = {
        vessels,
        generatedAt: now,
        source: 'SIMULERTE DATA (utvikling)',
        license: 'Ingen – simulert',
      }
      return new Promise((resolve) => setTimeout(() => resolve(snapshot), 400))
    },
  }
}
