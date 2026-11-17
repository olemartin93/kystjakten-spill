const nb = new Intl.NumberFormat('nb-NO')

export const formatScore = (n: number): string => nb.format(Math.round(n))

export const formatKnots = (knots: number): string =>
  `${knots.toLocaleString('nb-NO', { maximumFractionDigits: 1, minimumFractionDigits: 1 })} kn`

export const formatDegrees = (deg: number): string =>
  `${String(Math.round(deg) % 360).padStart(3, '0')}°`

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`
  const km = meters / 1000
  return `${km.toLocaleString('nb-NO', { maximumFractionDigits: km < 10 ? 1 : 0 })} km`
}
