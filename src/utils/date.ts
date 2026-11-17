/** YYYY-MM-DD for the given instant in Norwegian time – the daily challenge rolls over at midnight in Norway. */
export function osloDateKey(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Oslo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function formatDateNb(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  if (y === undefined || m === undefined || d === undefined) return dateKey
  return new Intl.DateTimeFormat('nb-NO', { day: 'numeric', month: 'long' }).format(
    new Date(Date.UTC(y, m - 1, d, 12)),
  )
}

/** "4 min siden", "2 t siden" */
export function formatAge(ms: number): string {
  const minutes = Math.max(0, Math.round(ms / 60_000))
  if (minutes < 1) return 'akkurat nå'
  if (minutes < 60) return `${minutes} min siden`
  const hours = Math.round(minutes / 60)
  return `${hours} t siden`
}
