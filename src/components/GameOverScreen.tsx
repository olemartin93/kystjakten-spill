import { useEffect, useRef, useState } from 'react'
import type { GameState } from '../game/engine'
import { summarize } from '../game/engine'
import { formatDateNb } from '../utils/date'
import { formatScore } from '../utils/format'
import { AnimatedNumber } from './AnimatedNumber'
import { CheckIcon, CrossIcon, RadarIcon, ShareIcon, TrophyIcon } from './Icons'
import { Wordmark } from './Logo'

interface GameOverProps {
  game: GameState
  isNewHighScore: boolean
  isNewDailyBest: boolean
  previousBest: number
  dateKey: string
  harbourName: string
  endedEarly: boolean
  reducedMotion: boolean
  onPlayAgain: () => void
  onMenu: () => void
}

export function GameOverScreen(props: GameOverProps) {
  const { game } = props
  const summary = summarize(game)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const [shared, setShared] = useState<string | null>(null)
  useEffect(() => headingRef.current?.focus(), [])

  const daily = game.config.mode === 'daily'
  const record = daily ? props.isNewDailyBest : props.isNewHighScore
  const title = game.lives <= 0 ? 'Tom for redningsbøyer' : 'Vakta er over'

  const share = async () => {
    const marks = game.history.map((r) => (r.evaluation.correct ? '🟩' : '🟥')).join('')
    const text = `Fyrvakt${daily ? ` – dagens utfordring ${formatDateNb(props.dateKey)}` : ''}: ${formatScore(summary.score)} poeng ${marks}\n${window.location.href}`
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: 'Fyrvakt', text })
        return
      }
      await navigator.clipboard.writeText(text)
      setShared('Kopiert til utklippstavlen!')
    } catch {
      setShared(null)
    }
  }

  return (
    <div className="absolute inset-0 z-30 overflow-y-auto bg-abyss/70 backdrop-blur-sm">
      <div className="mx-auto flex min-h-full max-w-lg flex-col justify-center px-4 py-[max(env(safe-area-inset-top),1.5rem)]">
        <section
          aria-labelledby="gameover-title"
          className="panel chart-grid p-5 motion-safe:animate-rise sm:p-7"
        >
          <div className="flex items-center justify-between">
            <Wordmark className="text-sm text-mist" />
            <p className="label-caps text-[0.62rem]">
              {daily ? `Dagens · ${props.harbourName}` : props.harbourName}
            </p>
          </div>
          <h1
            id="gameover-title"
            ref={headingRef}
            tabIndex={-1}
            className="mt-4 font-display text-2xl font-bold outline-none"
          >
            {title}
          </h1>
          {props.endedEarly ? (
            <p className="mt-1 text-sm text-mist">
              Det ble for få skip i området til flere runder akkurat nå.
            </p>
          ) : null}

          <p
            className="mt-4 text-center font-display text-6xl font-bold text-beacon tabular-nums drop-shadow-[0_0_24px_rgb(255_194_75/0.35)]"
            aria-label={`${summary.score} poeng`}
          >
            <AnimatedNumber
              value={summary.score}
              durationMs={1200}
              reducedMotion={props.reducedMotion}
            />
          </p>
          <p className="text-center label-caps">poeng</p>

          {record && summary.score > 0 ? (
            <p
              className="mx-auto mt-3 flex w-fit items-center gap-2 rounded-full bg-beacon px-4 py-1.5 font-display font-bold text-sea-950 motion-safe:animate-pop"
              role="status"
            >
              <TrophyIcon className="size-5" /> {daily ? 'Ny dagsrekord!' : 'Ny rekord!'}
            </p>
          ) : props.previousBest > 0 ? (
            <p className="mt-3 text-center text-sm text-mist">
              {daily ? 'Beste i dag' : 'Rekord'}: {formatScore(props.previousBest)}
            </p>
          ) : null}

          <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
            <Stat label="Riktige" value={`${summary.correct}/${summary.rounds}`} />
            <Stat label="Beste rekke" value={String(summary.bestStreak)} />
            <Stat
              label="Snittid"
              value={`${summary.averageAnswerSeconds.toLocaleString('nb-NO', { maximumFractionDigits: 1 })} s`}
            />
          </dl>

          {game.history.length > 0 ? (
            <ol className="mt-5 space-y-1.5" aria-label="Runder">
              {game.history.map((r, i) => (
                <li
                  key={r.challenge.id + String(i)}
                  className="flex items-center gap-3 rounded-lg bg-sea-950/60 px-3 py-2 text-sm"
                >
                  {r.evaluation.correct ? (
                    <CheckIcon className="size-4 shrink-0 text-signal" title="Riktig" />
                  ) : (
                    <CrossIcon
                      className="size-4 shrink-0 text-alarm"
                      title={r.timedOut ? 'Tiden gikk ut' : 'Feil'}
                    />
                  )}
                  <span className="flex-1 truncate">{r.challenge.prompt}</span>
                  <span className="font-display font-semibold tabular-nums">
                    +{formatScore(r.score.total)}
                  </span>
                </li>
              ))}
            </ol>
          ) : null}

          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <button type="button" className="btn-primary sm:col-span-2" onClick={props.onPlayAgain}>
              <RadarIcon className="size-5" /> Spill igjen
            </button>
            <button type="button" className="btn-secondary" onClick={() => void share()}>
              <ShareIcon className="size-5" /> Del
            </button>
            <button type="button" className="btn-secondary" onClick={props.onMenu}>
              Til menyen
            </button>
          </div>
          <p className="mt-2 min-h-5 text-center text-sm text-signal" role="status">
            {shared}
          </p>
        </section>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-sea-700 bg-sea-950/60 px-2 py-2.5">
      <dt className="label-caps text-[0.6rem]">{label}</dt>
      <dd className="mt-0.5 font-display text-lg font-bold">{value}</dd>
    </div>
  )
}
