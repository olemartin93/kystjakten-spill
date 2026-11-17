import { useCallback, useEffect, useRef, useState } from 'react'
import type { PlayArea } from '../game/area'
import { findPlayArea, localCluster, POOL_MAX, vesselsNear } from '../game/area'
import { generateChallenge, orderKinds } from '../game/challenges'
import type { DailyPlan } from '../game/daily'
import { canonicalPool, dailyPlan, dailyRoundRng } from '../game/daily'
import type { GameState } from '../game/engine'
import {
  advance,
  beginRound,
  CLASSIC_CONFIG,
  createGame,
  DAILY_CONFIG,
  endGame,
  remainingMs,
  submitAnswer,
} from '../game/engine'
import type { ChallengeKind, GameMode } from '../game/types'
import type { LatLng, Vessel } from '../types/vessel'
import type { Rng } from '../utils/random'
import { createRng, pickOne } from '../utils/random'
import { playSound } from '../utils/sfx'

export const FLEET_SIZE = 7
const COUNTDOWN_FROM = 3
const COUNTDOWN_STEP_MS = 750

export interface GameSession {
  game: GameState
  area: PlayArea
  plan: DailyPlan | null
  /** 3, 2, 1 before the first round; null afterwards. */
  countdown: number | null
  endedEarly: boolean
  /** Unique per started game – keeps challenge ids unique across games. */
  id: number
}

export type StartResult = { ok: true; area: PlayArea } | { ok: false }

export function useGameController(vessels: Vessel[], soundOn: boolean) {
  const [session, setSessionState] = useState<GameSession | null>(null)
  const sessionRef = useRef<GameSession | null>(null)
  /** Single place that changes the session, so side effects never run inside state updaters. */
  const setSession = useCallback((next: GameSession | null) => {
    sessionRef.current = next
    setSessionState(next)
  }, [])
  const [now, setNow] = useState(() => Date.now())
  const vesselsRef = useRef(vessels)
  const rngRef = useRef<Rng | null>(null)
  const soundRef = useRef(soundOn)
  const gameCounter = useRef(0)
  useEffect(() => {
    vesselsRef.current = vessels
    soundRef.current = soundOn
  })

  const withNextRound = useCallback((s: GameSession): GameSession => {
    const t = Date.now()
    const rng = s.plan ? dailyRoundRng(s.plan, s.game.round) : (rngRef.current ?? createRng(1))
    let pool = vesselsNear(vesselsRef.current, s.area.center, s.area.radiusMeters, t).slice(
      0,
      POOL_MAX,
    )
    if (s.plan) pool = canonicalPool(pool)
    const anchor = pickOne(rng, pool)
    if (anchor) pool = localCluster(pool, anchor, t)
    const previous = s.game.history.at(-1)?.challenge.kind ?? null
    const planned: ChallengeKind[] = s.plan?.kinds[s.game.round - 1]
      ? [s.plan.kinds[s.game.round - 1] as ChallengeKind]
      : []
    const challenge = generateChallenge(
      { rng, pool, now: t, fleetSize: FLEET_SIZE, roundId: `g${s.id}-r${s.game.round}` },
      [...planned, ...orderKinds(rng, previous)],
    )
    if (!challenge) return { ...s, game: endGame(s.game), endedEarly: true }
    return { ...s, game: beginRound(s.game, challenge, t) }
  }, [])

  const start = useCallback(
    (mode: GameMode, center: LatLng): StartResult => {
      const plan = mode === 'daily' ? dailyPlan() : null
      const area = findPlayArea(vesselsRef.current, plan ? plan.harbour.center : center, Date.now())
      if (!area) return { ok: false }
      rngRef.current = createRng((Date.now() ^ Math.floor(Math.random() * 2 ** 31)) >>> 0)
      setSession({
        game: createGame(mode === 'daily' ? DAILY_CONFIG : CLASSIC_CONFIG),
        area,
        plan,
        countdown: COUNTDOWN_FROM,
        endedEarly: false,
        id: ++gameCounter.current,
      })
      return { ok: true, area }
    },
    [setSession],
  )

  // Countdown 3‑2‑1 → first round.
  const countdown = session?.countdown ?? null
  useEffect(() => {
    if (countdown === null) return
    playSound(countdown > 0 ? 'tick' : 'start', soundRef.current)
    const timer = window.setTimeout(() => {
      const s = sessionRef.current
      if (!s || s.countdown === null) return
      setSession(
        s.countdown > 1
          ? { ...s, countdown: s.countdown - 1 }
          : withNextRound({ ...s, countdown: null }),
      )
    }, COUNTDOWN_STEP_MS)
    return () => window.clearTimeout(timer)
  }, [countdown, withNextRound, setSession])

  // Round clock.
  const phase = session?.game.phase
  useEffect(() => {
    if (phase !== 'playing') return
    let lastSecond = -1
    const timer = window.setInterval(() => {
      const t = Date.now()
      setNow(t)
      const s = sessionRef.current
      if (!s || s.game.phase !== 'playing') return
      const left = remainingMs(s.game, t)
      const second = Math.ceil(left / 1000)
      if (second !== lastSecond && second <= 5 && second > 0) playSound('tick', soundRef.current)
      lastSecond = second
      if (left > 0) return
      playSound('wrong', soundRef.current)
      setSession({ ...s, game: submitAnswer(s.game, null, t) })
    }, 200)
    return () => window.clearInterval(timer)
  }, [phase, setSession])

  const pick = useCallback(
    (vesselId: string) => {
      const s = sessionRef.current
      if (!s || s.game.phase !== 'playing') return
      const game = submitAnswer(s.game, vesselId, Date.now())
      playSound(game.history.at(-1)?.evaluation.correct ? 'correct' : 'wrong', soundRef.current)
      setSession({ ...s, game })
    },
    [setSession],
  )

  const next = useCallback(() => {
    const s = sessionRef.current
    if (!s) return
    const game = advance(s.game)
    setSession(game.phase === 'ready' ? withNextRound({ ...s, game }) : { ...s, game })
  }, [withNextRound, setSession])

  const quit = useCallback(() => setSession(null), [setSession])

  return { session, now, start, pick, next, quit }
}
