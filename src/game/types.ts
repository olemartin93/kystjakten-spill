import type { LatLng, Vessel, VesselCategory } from '../types/vessel'

export type ChallengeKind =
  | 'fastest'
  | 'slowest'
  | 'closest'
  | 'direction'
  | 'bearing'
  | 'category'
  | 'cruise'
  | 'speedRange'
  | 'longest'

export interface ChallengeParams {
  category?: VesselCategory
  /** Compass direction (degrees) for "direction" and "bearing" challenges. */
  direction?: number
  minSpeed?: number
  maxSpeed?: number
}

export interface Challenge {
  id: string
  kind: ChallengeKind
  /** Short label, e.g. "Raskest". */
  title: string
  /** The objective shown to the player. */
  prompt: string
  /** One-line help on how to read the radar for this challenge. */
  hint: string
  /** Vessels in play this round (snapshot at round start). */
  fleet: Vessel[]
  /** Ids of correct vessels known at build time. "closest" is re-evaluated at answer time. */
  correctIds: string[]
  target: LatLng | null
  params: ChallengeParams
}

export interface Evaluation {
  correct: boolean
  /** 0–1: how close the pick was to the ideal answer. */
  accuracy: number
  correctIds: string[]
}

export type GameMode = 'classic' | 'daily'
