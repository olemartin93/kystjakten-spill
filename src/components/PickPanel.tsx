import { useEffect, useId, useRef, useState } from 'react'
import type { Challenge } from '../game/types'
import { CATEGORY_LABEL } from '../services/ais/shipTypes'
import type { Vessel } from '../types/vessel'
import { CheckIcon, ListIcon } from './Icons'
import { ShipSwatch } from './Legend'

interface PickPanelProps {
  challenge: Challenge
  letters: Map<string, string>
  selectedId: string | null
  alwaysShowList: boolean
  onSelect: (id: string | null) => void
  onConfirm: (id: string) => void
}

const LetterBadge = ({ letter }: { letter: string }) => (
  <span className="grid size-8 shrink-0 place-items-center rounded-lg border-2 border-foam bg-sea-950 font-display text-base font-bold">
    {letter}
  </span>
)

/** Lets the player inspect and confirm a vessel – by tapping the map or using the accessible list. */
export function PickPanel({
  challenge,
  letters,
  selectedId,
  alwaysShowList,
  onSelect,
  onConfirm,
}: PickPanelProps) {
  const [listOpen, setListOpen] = useState(false)
  const listId = useId()
  const fleet = [...challenge.fleet].sort((a, b) =>
    (letters.get(a.id) ?? '').localeCompare(letters.get(b.id) ?? ''),
  )
  const selected = fleet.find((v) => v.id === selectedId)
  const showList = alwaysShowList || listOpen
  // Length is the answer in these challenges – it is revealed afterwards.
  const hideLength = challenge.kind === 'longest' || challenge.kind === 'cruise'

  return (
    <div className="pointer-events-auto panel p-3 sm:p-4">
      {selected ? (
        <SelectedVessel
          hideLength={hideLength}
          vessel={selected}
          letter={letters.get(selected.id) ?? '?'}
          onCancel={() => onSelect(null)}
          onConfirm={() => onConfirm(selected.id)}
        />
      ) : (
        <div className="flex items-center gap-3">
          <p className="flex-1 text-sm text-mist">
            <span className="font-semibold text-foam">Trykk på et skip</span> på kartet for å velge
            det.
          </p>
          {alwaysShowList ? null : (
            <button
              type="button"
              className="btn-secondary min-h-11 px-3 text-sm"
              aria-expanded={listOpen}
              aria-controls={listId}
              onClick={() => setListOpen((o) => !o)}
            >
              <ListIcon className="size-4" /> Liste
            </button>
          )}
        </div>
      )}

      {showList ? (
        <div id={listId} className="mt-3">
          <h3 className="label-caps mb-2 text-[0.62rem]">Fartøy i denne runden</h3>
          <ul className="grid max-h-[32dvh] gap-1.5 overflow-y-auto lg:max-h-none">
            {fleet.map((v) => {
              const letter = letters.get(v.id) ?? '?'
              const isSelected = v.id === selectedId
              return (
                <li key={v.id}>
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => onSelect(isSelected ? null : v.id)}
                    className={`flex min-h-12 w-full items-center gap-3 rounded-xl border px-2.5 py-1.5 text-left transition-colors ${
                      isSelected
                        ? 'border-foam bg-sea-700'
                        : 'border-sea-700 bg-sea-900 hover:border-sea-600 hover:bg-sea-800'
                    }`}
                  >
                    <LetterBadge letter={letter} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{v.name}</span>
                      <span className="flex items-center gap-1.5 text-xs text-mist">
                        <ShipSwatch category={v.category} className="h-4 w-3" />
                        {CATEGORY_LABEL[v.category]}
                        {v.length === null || hideLength ? '' : ` · ${v.length} m`}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

function SelectedVessel({
  hideLength,
  vessel,
  letter,
  onCancel,
  onConfirm,
}: {
  hideLength: boolean
  vessel: Vessel
  letter: string
  onCancel: () => void
  onConfirm: () => void
}) {
  const confirmRef = useRef<HTMLButtonElement>(null)
  // Move focus to the confirm button so keyboard and screen reader users can act right away.
  useEffect(() => {
    confirmRef.current?.focus({ preventScroll: true })
  }, [vessel.id])
  return (
    <div className="motion-safe:animate-fade">
      <div className="flex items-center gap-3">
        <LetterBadge letter={letter} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg leading-tight font-bold">{vessel.name}</p>
          <p className="flex items-center gap-1.5 text-sm text-mist">
            <ShipSwatch category={vessel.category} className="h-4 w-3" />
            {CATEGORY_LABEL[vessel.category]}
            {vessel.length === null || hideLength ? '' : ` · ${vessel.length} m`}
          </p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-[auto_1fr] gap-2">
        <button type="button" className="btn-ghost min-h-13 px-4" onClick={onCancel}>
          Avbryt
        </button>
        <button ref={confirmRef} type="button" className="btn-primary min-h-13" onClick={onConfirm}>
          <CheckIcon className="size-5" /> Velg {letter}
        </button>
      </div>
    </div>
  )
}
