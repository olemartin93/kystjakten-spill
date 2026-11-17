import type { VesselCategory } from '../../types/vessel'

/** Map an AIS ship type code (ITU-R M.1371, table 53) to a broad category. */
export function categoryForShipType(code: number | null): VesselCategory {
  if (code === null) return 'other'
  if (code === 30) return 'fishing'
  if (code === 31 || code === 32 || code === 52) return 'tug'
  if (code === 36) return 'sailing'
  if (code === 37) return 'pleasure'
  if (code >= 40 && code <= 49) return 'highspeed'
  if ([33, 34, 35, 50, 51, 53, 54, 55, 58, 59].includes(code)) return 'service'
  if (code >= 60 && code <= 69) return 'passenger'
  if (code >= 70 && code <= 79) return 'cargo'
  if (code >= 80 && code <= 89) return 'tanker'
  return 'other'
}

export const CATEGORY_LABEL: Record<VesselCategory, string> = {
  passenger: 'Passasjerskip',
  cargo: 'Lasteskip',
  tanker: 'Tankskip',
  fishing: 'Fiskefartøy',
  tug: 'Slepebåt',
  highspeed: 'Hurtigbåt',
  sailing: 'Seilbåt',
  pleasure: 'Fritidsbåt',
  service: 'Tjenestefartøy',
  other: 'Annet fartøy',
}

/** Marker colours – chosen to stay distinguishable on the dark sea and never used as the only cue. */
export const CATEGORY_COLOR: Record<VesselCategory, string> = {
  passenger: '#ff8fb1',
  cargo: '#7cc4ff',
  tanker: '#ffb05c',
  fishing: '#8ef0a7',
  tug: '#d7b4ff',
  highspeed: '#ffe066',
  sailing: '#f2f5f7',
  pleasure: '#b8e8ff',
  service: '#ff6b6b',
  other: '#9fb3c2',
}

/** One-letter code drawn inside the marker so category never relies on colour alone. */
export const CATEGORY_GLYPH: Record<VesselCategory, string> = {
  passenger: 'P',
  cargo: 'L',
  tanker: 'T',
  fishing: 'F',
  tug: 'S',
  highspeed: 'H',
  sailing: 'Se',
  pleasure: 'Fr',
  service: 'Tj',
  other: '?',
}
