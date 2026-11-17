import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Countdown } from './components/Countdown'
import { ErrorPanel } from './components/ErrorPanel'
import { GameHud } from './components/GameHud'
import { GameOverScreen } from './components/GameOverScreen'
import { HowToDialog } from './components/HowToDialog'
import { MapCredits } from './components/MapCredits'
import { ObjectiveCard } from './components/ObjectiveCard'
import { PickPanel } from './components/PickPanel'
import { RevealCard } from './components/RevealCard'
import { SplashScreen } from './components/SplashScreen'
import type { DataInfo } from './components/StartScreen'
import { StartScreen } from './components/StartScreen'
import { DEFAULT_HARBOUR, vesselsNear } from './game/area'
import { dailyPlan } from './game/daily'
import { isFinalRound, remainingMs } from './game/engine'
import { resultHeadline } from './game/explain'
import { assignLetters } from './game/letters'
import type { GameMode } from './game/types'
import { useAisData } from './hooks/useAisData'
import { useClock } from './hooks/useClock'
import { useGameController } from './hooks/useGameController'
import { useGeolocation } from './hooks/useGeolocation'
import { useOnline } from './hooks/useOnline'
import { useIsDesktop, useReducedMotion } from './hooks/useReducedMotion'
import type { FleetMarker, MarkerState } from './map/features'
import type { CameraPadding } from './map/MapView'
import { MapView } from './map/MapView'
import type { Progress } from './persistence/progress'
import {
  loadProgress,
  loadSettings,
  recordResult,
  saveProgress,
  saveSettings,
} from './persistence/progress'
import type { Vessel } from './types/vessel'
import { osloDateKey } from './utils/date'
import { formatScore } from './utils/format'

const NO_VESSELS: Vessel[] = []
const MENU_TRAFFIC_RADIUS_M = 60_000
const MENU_TRAFFIC_MAX = 400
const STALE_DATA_MS = 3 * 60 * 60_000

const MOBILE_PADDING: CameraPadding = { top: 260, bottom: 200, left: 36, right: 36 }
const DESKTOP_PADDING: CameraPadding = { top: 60, bottom: 60, left: 480, right: 90 }

interface ResultInfo {
  isNewHighScore: boolean
  isNewDailyBest: boolean
  previousBest: number
}

export function App() {
  const reducedMotion = useReducedMotion()
  const isDesktop = useIsDesktop()
  const online = useOnline()
  const ais = useAisData()
  const geo = useGeolocation()
  const [settings, setSettings] = useState(loadSettings)
  const [progress, setProgress] = useState<Progress>(() => loadProgress())
  const [howToOpen, setHowToOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [selection, setSelection] = useState<{ challengeId: string; vesselId: string } | null>(null)
  const [result, setResult] = useState<ResultInfo | null>(null)
  const [lastMode, setLastMode] = useState<GameMode>('classic')

  const clock = useClock(30_000)
  const vessels = ais.snapshot?.vessels ?? NO_VESSELS
  const controller = useGameController(vessels, settings.sound)
  const { session } = controller
  const game = session?.game ?? null
  const challenge = game?.challenge ?? null
  const dateKey = osloDateKey()
  const plan = useMemo(() => dailyPlan(dateKey), [dateKey])

  const playerCenter = geo.position ?? DEFAULT_HARBOUR.center
  const locationLabel = geo.position ? 'Din posisjon' : `${DEFAULT_HARBOUR.name} (standard)`

  // ---- settings ----
  const updateSettings = (patch: Partial<typeof settings>) => {
    setSettings((s) => {
      const next = { ...s, ...patch }
      saveSettings(next)
      return next
    })
  }

  // ---- start / stop ----
  const startGame = async (mode: GameMode) => {
    setNotice(null)
    setResult(null)
    setSelection(null)
    setLastMode(mode)
    let center = playerCenter
    if (mode === 'classic' && geo.status === 'idle') {
      setBusy(true)
      center = (await geo.request()) ?? DEFAULT_HARBOUR.center
      setBusy(false)
    }
    const started = controller.start(mode, center)
    if (!started.ok) {
      setNotice('Vi fant ikke nok skip i farvannet akkurat nå. Prøv igjen om litt.')
      return
    }
    if (mode === 'classic' && started.area.relocatedTo) {
      setToast(`Stille rundt deg – vi har tatt deg med til ${started.area.relocatedTo.name}.`)
    } else if (mode === 'daily') {
      setToast(`Dagens utfordring: ${started.area.relocatedTo?.name ?? plan.harbour.name}`)
    }
  }

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 5000)
    return () => window.clearTimeout(t)
  }, [toast])

  // ---- record results once per finished game ----
  const recordedRef = useRef<object | null>(null)
  useEffect(() => {
    if (!game || game.phase !== 'gameover' || recordedRef.current === session) return
    recordedRef.current = session
    const previousBest =
      game.config.mode === 'daily' ? (progress.daily[dateKey] ?? 0) : progress.highScore
    const r = recordResult(progress, {
      mode: game.config.mode,
      score: game.score,
      bestStreak: game.bestStreak,
      dateKey,
    })
    saveProgress(r.progress)
    setProgress(r.progress)
    setResult({ isNewHighScore: r.isNewHighScore, isNewDailyBest: r.isNewDailyBest, previousBest })
  }, [game, session, dateKey, progress])

  // ---- selection is tied to the current round, so it resets automatically ----
  const selectedId =
    selection && selection.challengeId === challenge?.id ? selection.vesselId : null
  const challengeId = challenge?.id ?? null
  const select = useCallback(
    (vesselId: string | null) => {
      setSelection(vesselId && challengeId ? { challengeId, vesselId } : null)
    },
    [challengeId],
  )

  // ---- screen reader announcements (derived, polite live region) ----
  const lastRecord = game?.history.at(-1) ?? null
  const announcement =
    game?.phase === 'playing' && challenge
      ? `Runde ${game.round} av ${game.config.totalRounds}. ${challenge.prompt}.`
      : game?.phase === 'reveal' && lastRecord
        ? `${resultHeadline(lastRecord)} ${formatScore(lastRecord.score.total)} poeng.`
        : ''

  const letters = useMemo(
    () => (challenge ? assignLetters(challenge.fleet) : new Map<string, string>()),
    [challenge],
  )
  const revealRecord = game?.phase === 'reveal' ? lastRecord : null

  // ---- keyboard shortcuts: letters select, Escape clears ----
  useEffect(() => {
    if (game?.phase !== 'playing') return
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || howToOpen) return
      if (e.key === 'Escape') {
        select(null)
        return
      }
      const key = e.key.toUpperCase()
      for (const [id, letter] of letters) {
        if (letter === key) {
          select(id)
          e.preventDefault()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [game?.phase, letters, howToOpen, select])

  // ---- map data ----
  const referenceTime = ais.snapshot?.generatedAt ?? 0
  const menuTraffic = useMemo(
    () =>
      session
        ? NO_VESSELS
        : vesselsNear(vessels, playerCenter, MENU_TRAFFIC_RADIUS_M, referenceTime).slice(
            0,
            MENU_TRAFFIC_MAX,
          ),
    [session, vessels, playerCenter, referenceTime],
  )
  const fleetMarkers = useMemo((): FleetMarker[] => {
    if (!challenge || !game) return []
    return challenge.fleet.map((vessel) => {
      let state: MarkerState = vessel.id === selectedId ? 'selected' : 'idle'
      if (revealRecord) {
        const isAnswer = revealRecord.evaluation.correctIds.includes(vessel.id)
        const isPicked = revealRecord.pickedId === vessel.id
        state = isAnswer ? (isPicked ? 'correct' : 'missed') : isPicked ? 'wrong' : 'dimmed'
      }
      return { vessel, letter: letters.get(vessel.id) ?? '?', state }
    })
  }, [challenge, game, selectedId, revealRecord, letters])

  const focusKey = challenge
    ? challenge.id
    : `menu-${playerCenter.latitude}-${playerCenter.longitude}-${session ? 'game' : 'menu'}`
  const mapCenter = session?.area.center ?? playerCenter

  // ---- render ----
  const dataInfo: DataInfo | null = ais.snapshot
    ? {
        vesselCount: ais.snapshot.vessels.length,
        generatedAt: ais.snapshot.generatedAt,
        degraded: ais.error !== null,
      }
    : null
  const staleNotice =
    ais.snapshot && referenceTime > 0 && clock - referenceTime > STALE_DATA_MS
      ? 'Skipsdataene er noen timer gamle akkurat nå, så skipene kan ha flyttet seg.'
      : null

  const activeGame = game && game.phase !== 'gameover' ? game : null
  const remaining = game ? remainingMs(game, controller.now) : 0

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-sea-950">
      <MapView
        center={mapCenter}
        playerPosition={geo.position}
        traffic={menuTraffic}
        fleet={fleetMarkers}
        target={challenge?.target ?? null}
        focusKey={focusKey}
        padding={isDesktop ? DESKTOP_PADDING : MOBILE_PADDING}
        showSeaChart={settings.nauticalChart}
        reducedMotion={reducedMotion}
        {...(game?.phase === 'playing' ? { onPick: select } : {})}
        onSeaChartError={() => {
          if (settings.nauticalChart) {
            updateSettings({ nauticalChart: false })
            setToast('Sjøkartet fra Kartverket er ikke tilgjengelig akkurat nå.')
          }
        }}
        onMapUnavailable={() =>
          setNotice('Kartet kunne ikke vises på denne enheten (WebGL mangler).')
        }
      />
      {/* Vignette keeps the UI readable without hiding the map */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgb(2_11_19/0.65)_100%)]"
        aria-hidden="true"
      />

      {!online ? (
        <p className="absolute top-[max(env(safe-area-inset-top),0.5rem)] left-1/2 z-40 -translate-x-1/2 rounded-full border border-beacon/50 bg-sea-950/95 px-3 py-1 text-xs font-semibold text-beacon">
          Offline – spiller på sist hentede data
        </p>
      ) : null}

      {!session ? (
        <StartScreen
          progress={progress}
          plan={plan}
          locationStatus={geo.status}
          locationLabel={locationLabel}
          dataInfo={dataInfo}
          now={clock}
          settings={settings}
          busy={busy || ais.status !== 'ready'}
          notice={notice ?? staleNotice}
          onRequestLocation={() => void geo.request()}
          onPlay={() => void startGame('classic')}
          onPlayDaily={() => void startGame('daily')}
          onHowTo={() => setHowToOpen(true)}
          onToggleSound={() => updateSettings({ sound: !settings.sound })}
          onToggleChart={() => updateSettings({ nauticalChart: !settings.nauticalChart })}
        />
      ) : null}

      {activeGame ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex flex-col gap-2 p-2 pt-[max(env(safe-area-inset-top),0.5rem)] pb-[max(env(safe-area-inset-bottom),0.5rem)] sm:p-4 lg:w-[28rem] lg:p-5">
          <GameHud
            game={activeGame}
            remainingMs={remaining}
            reducedMotion={reducedMotion}
            modeLabel={
              activeGame.config.mode === 'daily'
                ? `Dagens · ${session?.area.relocatedTo?.name ?? plan.harbour.name}`
                : 'Fyrvakt'
            }
            onQuit={() => {
              if (window.confirm('Avslutte spillet? Poengene dine lagres ikke.')) controller.quit()
            }}
          />
          {challenge ? <ObjectiveCard challenge={challenge} /> : null}
          {toast ? (
            <p
              role="status"
              className="pointer-events-auto mx-auto rounded-full border border-signal/40 bg-sea-950/95 px-3 py-1.5 text-center text-sm motion-safe:animate-fade"
            >
              {toast}
            </p>
          ) : null}
          <div className="mt-auto space-y-1.5 lg:mt-0">
            {activeGame.phase === 'playing' && challenge ? (
              <PickPanel
                challenge={challenge}
                letters={letters}
                selectedId={selectedId}
                alwaysShowList={isDesktop}
                onSelect={select}
                onConfirm={(id) => controller.pick(id)}
              />
            ) : null}
            {revealRecord ? (
              <RevealCard
                record={revealRecord}
                letters={letters}
                isFinal={isFinalRound(activeGame)}
                revealedAt={activeGame.roundStartedAt + revealRecord.elapsedMs}
                onNext={controller.next}
              />
            ) : null}
            <MapCredits className="pointer-events-auto px-1 text-center lg:hidden" />
          </div>
        </div>
      ) : null}

      {session?.countdown != null ? (
        <Countdown
          value={session.countdown}
          prompt={session.plan ? 'Dagens utfordring' : 'Gjør deg klar'}
        />
      ) : null}

      {game?.phase === 'gameover' ? (
        <GameOverScreen
          game={game}
          isNewHighScore={result?.isNewHighScore ?? false}
          isNewDailyBest={result?.isNewDailyBest ?? false}
          previousBest={result?.previousBest ?? 0}
          dateKey={dateKey}
          harbourName={
            session?.area.relocatedTo?.name ?? (session?.plan ? plan.harbour.name : locationLabel)
          }
          endedEarly={session?.endedEarly ?? false}
          reducedMotion={reducedMotion}
          onPlayAgain={() => void startGame(lastMode)}
          onMenu={controller.quit}
        />
      ) : null}

      {ais.status === 'loading' ? <SplashScreen /> : null}
      {ais.status === 'error' ? <ErrorPanel code={ais.error} onRetry={ais.reload} /> : null}

      <HowToDialog open={howToOpen} onClose={() => setHowToOpen(false)} />
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
    </div>
  )
}
