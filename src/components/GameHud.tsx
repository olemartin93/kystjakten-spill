import type { GameState } from '../game/engine'
import { streakMultiplier } from '../game/scoring'
import { AnimatedNumber } from './AnimatedNumber'
import { CloseIcon, FlameIcon, LifebuoyIcon } from './Icons'

interface GameHudProps {
  game: GameState
  remainingMs: number
  reducedMotion: boolean
  modeLabel: string
  onQuit: () => void
}

export function GameHud({ game, remainingMs, reducedMotion, modeLabel, onQuit }: GameHudProps) {
  const total = game.config.roundSeconds * 1000
  const fraction = game.phase === 'playing' ? remainingMs / total : 0
  const seconds = Math.ceil(remainingMs / 1000)
  const urgent = game.phase === 'playing' && seconds <= 5
  const multiplier = streakMultiplier(game.streak)

  return (
    <div className="pointer-events-auto rounded-2xl border border-sea-600/60 bg-sea-950/90 px-3 pt-2 pb-2.5 shadow-lg backdrop-blur">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onQuit}
          className="-ml-1 grid size-11 shrink-0 place-items-center rounded-xl text-mist hover:bg-sea-800 hover:text-foam"
          aria-label="Avslutt spillet"
        >
          <CloseIcon className="size-5" />
        </button>
        <div className="min-w-0">
          <p className="label-caps truncate text-[0.62rem]">{modeLabel}</p>
          <p className="font-display text-sm font-semibold">
            Runde {game.round}
            <span className="text-mist">/{game.config.totalRounds}</span>
          </p>
        </div>

        <p
          className="ml-auto text-right font-display text-2xl leading-none font-bold tabular-nums"
          aria-label={`Poeng: ${game.score}`}
        >
          <AnimatedNumber value={game.score} reducedMotion={reducedMotion} />
        </p>

        <div className="flex flex-col items-end gap-1 pl-2">
          <p
            className="flex gap-0.5"
            aria-label={`${game.lives} av ${game.config.lives} redningsbøyer igjen`}
            role="img"
          >
            {Array.from({ length: game.config.lives }, (_, i) => (
              <LifebuoyIcon
                key={i}
                className={`size-4 ${i < game.lives ? 'text-alarm' : 'text-sea-600'}`}
              />
            ))}
          </p>
          {game.streak >= 2 ? (
            <p
              key={game.streak}
              className="flex items-center gap-1 rounded-full bg-beacon/15 px-2 font-display text-xs font-bold text-beacon motion-safe:animate-pop"
            >
              <FlameIcon className="size-3.5" />
              {game.streak} på rad ×{multiplier.toLocaleString('nb-NO')}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <div
          className="h-2 flex-1 overflow-hidden rounded-full bg-sea-800"
          role="progressbar"
          aria-label="Tid igjen"
          aria-valuemin={0}
          aria-valuemax={game.config.roundSeconds}
          aria-valuenow={Math.max(0, seconds)}
          aria-valuetext={`${Math.max(0, seconds)} sekunder igjen`}
        >
          <div
            className={`h-full rounded-full transition-[width] duration-200 ease-linear ${urgent ? 'bg-alarm' : 'bg-signal'}`}
            style={{ width: `${Math.max(0, Math.min(1, fraction)) * 100}%` }}
          />
        </div>
        <span
          className={`w-8 text-right font-display text-sm font-bold tabular-nums ${urgent ? 'text-alarm' : 'text-mist'}`}
          aria-hidden="true"
        >
          {game.phase === 'playing' ? `${Math.max(0, seconds)}s` : '–'}
        </span>
      </div>
    </div>
  )
}
