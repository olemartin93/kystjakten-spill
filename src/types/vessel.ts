/** Broad vessel groups derived from the AIS "ship type" code (ITU-R M.1371). */
export type VesselCategory =
  | 'passenger'
  | 'cargo'
  | 'tanker'
  | 'fishing'
  | 'tug'
  | 'highspeed'
  | 'sailing'
  | 'pleasure'
  | 'service'
  | 'other'

/** The normalized vessel model the game engine works with. Independent of any AIS API. */
export interface Vessel {
  /** Stable id – the MMSI as a string. */
  id: string
  mmsi: number
  name: string
  latitude: number
  longitude: number
  /** Speed over ground in knots. */
  speed: number
  /** Course over ground in degrees (0–360), null when not available. */
  course: number | null
  /** True heading in degrees (0–359), null when not available. */
  heading: number | null
  shipType: number | null
  category: VesselCategory
  /** Overall length in metres, null when unknown. */
  length: number | null
  destination: string | null
  /** Time of the AIS message, epoch milliseconds. */
  timestamp: number
}

export interface AisSnapshot {
  vessels: Vessel[]
  /** When the data was fetched from the AIS source (epoch ms). */
  generatedAt: number
  source: string
  license: string
}

export interface LatLng {
  latitude: number
  longitude: number
}
