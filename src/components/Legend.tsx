import { CATEGORY_COLOR, CATEGORY_LABEL } from '../services/ais/shipTypes'
import type { VesselCategory } from '../types/vessel'

const SHOWN: VesselCategory[] = [
  'passenger',
  'cargo',
  'tanker',
  'fishing',
  'highspeed',
  'tug',
  'pleasure',
  'service',
  'other',
]

export function ShipSwatch({
  category,
  className = 'size-3.5',
}: {
  category: VesselCategory
  className?: string
}) {
  return (
    <svg viewBox="0 0 14 20" className={className} aria-hidden="true">
      <path
        d="M7 1C11 5 11 9 11 13v5Q7 19.5 3 18v-5C3 9 3 5 7 1Z"
        fill={CATEGORY_COLOR[category]}
        stroke="#03101a"
        strokeWidth="1.2"
      />
    </svg>
  )
}

export function Legend({ compact = false }: { compact?: boolean }) {
  return (
    <ul
      className={`grid gap-x-4 gap-y-1.5 text-sm ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}
    >
      {SHOWN.map((c) => (
        <li key={c} className="flex items-center gap-2">
          <ShipSwatch category={c} className="h-5 w-3.5 shrink-0" />
          <span>{CATEGORY_LABEL[c]}</span>
        </li>
      ))}
    </ul>
  )
}
