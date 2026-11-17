import { useEffect, useRef } from 'react'
import type { RoundRecord } from '../game/engine'
import { keyFact, resultHeadline, vesselById } from '../game/explain'
import { CATEGORY_LABEL } from '../services/ais/shipTypes'
import type { Vessel } from '../types/vessel'
import { formatScore } from '../utils/format'
import { ArrowIcon, CheckIcon, CrossIcon } from './Icons'
import { ShipSwatch } from './Legend'

interface RevealCardProps {
  record: RoundRecord
  letters: Map<string, string>
  isFinal: boolean
  revealedAt: number
  onNext: () => void
}

export function RevealCard({ record, letters, isFinal, revealedAt, onNext }: RevealCardProps) {
  const nextRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    nextRef.current?.focus({ preventScroll: true })
  }, [record])

  const correct = record.evaluation.correct
  const answer = vesselById(record, record.evaluation.correctIds[0] ?? null)
  const picked = vesselById(record, record.pickedId)
  const { score } = record

  return (
    <div
      className={`pointer-events-auto panel overflow-hidden p-0 ${correct ? 'motion-safe:animate-pop' : 'motion-safe:animate-shake'}`}
    >
      <div
        className={`flex items-center gap-3 px-4 py-3 ${correct ? 'bg-signal/15' : 'bg-alarm/15'}`}
      >
        <span
          className={`grid size-10 shrink-0 place-items-center rounded-full ${correct ? 'bg-signal text-sea-950' : 'bg-alarm text-sea-950'}`}
          aria-hidden="true"
        >
          {correct ? <CheckIcon className="size-6" /> : <CrossIcon className="size-6" />}
        </span>
        <div className="flex-1">
          <h2 className="font-display text-xl font-bold">{resultHeadline(record)}</h2>
          <p className="text-sm text-mist">{record.challenge.prompt}</p>
        </div>
        <p
          className={`font-display text-2xl font-bold tabular-nums ${score.total > 0 ? 'text-beacon' : 'text-mist'}`}
        >
          +{formatScore(score.total)}
        </p>
      </div>

      <div className="space-y-2 px-4 py-3">
        {answer ? (
          <VesselLine
            label={correct ? 'Ditt valg' : 'Riktig svar'}
            tone="good"
            vessel={answer}
            letter={letters.get(answer.id)}
            fact={keyFact(record, answer, revealedAt)}
          />
        ) : null}
        {!correct && picked ? (
          <VesselLine
            label="Ditt valg"
            tone="bad"
            vessel={picked}
            letter={letters.get(picked.id)}
            fact={keyFact(record, picked, revealedAt)}
          />
        ) : null}

        {score.total > 0 ? (
          <dl className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs text-mist">
            {score.base > 0 ? <Item label="Grunnpoeng" value={formatScore(score.base)} /> : null}
            {score.timeBonus > 0 ? (
              <Item label="Tid" value={`+${formatScore(score.timeBonus)}`} />
            ) : null}
            {score.accuracyBonus > 0 ? (
              <Item
                label={correct ? 'Presisjon' : 'Nesten-bonus'}
                value={`+${formatScore(score.accuracyBonus)}`}
              />
            ) : null}
            {score.multiplier > 1 ? (
              <Item label="Rekke" value={`×${score.multiplier.toLocaleString('nb-NO')}`} />
            ) : null}
          </dl>
        ) : null}

        <button ref={nextRef} type="button" className="btn-primary mt-1 w-full" onClick={onNext}>
          {isFinal ? 'Se resultatet' : 'Neste runde'} <ArrowIcon className="size-5" />
        </button>
      </div>
    </div>
  )
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1">
      <dt>{label}</dt>
      <dd className="font-semibold text-foam">{value}</dd>
    </div>
  )
}

function VesselLine({
  label,
  tone,
  vessel,
  letter,
  fact,
}: {
  label: string
  tone: 'good' | 'bad'
  vessel: Vessel
  letter: string | undefined
  fact: string
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${tone === 'good' ? 'border-signal/50' : 'border-alarm/50'}`}
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-lg border-2 border-foam font-display font-bold">
        {letter ?? '?'}
      </span>
      <div className="min-w-0 flex-1">
        <p className="label-caps text-[0.6rem]">{label}</p>
        <p className="truncate font-semibold">{vessel.name}</p>
        <p className="flex items-center gap-1.5 text-xs text-mist">
          <ShipSwatch category={vessel.category} className="h-4 w-3" />
          {CATEGORY_LABEL[vessel.category]}
          {vessel.destination ? ` · mot ${vessel.destination}` : ''}
        </p>
      </div>
      <p className="text-right font-display text-sm font-bold">{fact}</p>
    </div>
  )
}
