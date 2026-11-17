import { categoryForShipType } from '../services/ais/shipTypes'
import type { Vessel } from '../types/vessel'

export const NOW = Date.parse('2026-11-17T12:00:00Z')

let counter = 0
/** Test vessel factory – positions default to the Ålesund area. */
export function vessel(overrides: Partial<Vessel> = {}): Vessel {
  counter += 1
  const mmsi = overrides.mmsi ?? 257_100_000 + counter
  const shipType = overrides.shipType ?? 70
  return {
    id: String(mmsi),
    mmsi,
    name: `TEST ${counter}`,
    latitude: 62.47 + (counter % 7) * 0.01,
    longitude: 6.15 + (counter % 5) * 0.02,
    speed: 10,
    course: 45,
    heading: 45,
    shipType,
    category: categoryForShipType(shipType),
    length: 100,
    destination: null,
    timestamp: NOW,
    ...overrides,
  }
}

/** A varied fleet that supports every challenge kind. */
export function variedPool(): Vessel[] {
  return [
    vessel({ speed: 18.4, course: 2, shipType: 60, length: 210 }),
    vessel({ speed: 0, course: null, heading: null, shipType: 70, length: 90 }),
    vessel({ speed: 3.1, course: 182, shipType: 30, length: 25 }),
    vessel({ speed: 11.2, course: 95, shipType: 80, length: 180 }),
    vessel({ speed: 7.5, course: 268, shipType: 52, length: 32 }),
    vessel({ speed: 24.0, course: 140, shipType: 40, length: 40 }),
    vessel({ speed: 12.5, course: 320, shipType: 70, length: 120 }),
    vessel({ speed: 5.2, course: 200, shipType: 37, length: 12 }),
    vessel({ speed: 9.0, course: 30, shipType: 70, length: 150 }),
    vessel({ speed: 1.5, course: 75, shipType: 30, length: 18 }),
    vessel({ speed: 14.8, course: 250, shipType: 60, length: 60 }),
    vessel({ speed: 0.2, course: 10, shipType: 80, length: 240 }),
  ]
}
