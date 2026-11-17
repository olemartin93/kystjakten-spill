import type { DailyPlan } from '../game/daily'
import type { LocationStatus } from '../hooks/useGeolocation'
import type { Progress, Settings } from '../persistence/progress'
import { formatAge, formatDateNb } from '../utils/date'
import { formatScore } from '../utils/format'
import {
  CalendarIcon,
  ChartIcon,
  InfoIcon,
  PinIcon,
  RadarIcon,
  SoundIcon,
  TrophyIcon,
} from './Icons'
import { LogoMark, Wordmark } from './Logo'
import { MapCredits } from './MapCredits'

export interface DataInfo {
  vesselCount: number
  generatedAt: number
  degraded: boolean
}

interface StartScreenProps {
  progress: Progress
  plan: DailyPlan
  locationStatus: LocationStatus
  locationLabel: string
  dataInfo: DataInfo | null
  now: number
  settings: Settings
  busy: boolean
  notice: string | null
  onRequestLocation: () => void
  onPlay: () => void
  onPlayDaily: () => void
  onHowTo: () => void
  onToggleSound: () => void
  onToggleChart: () => void
}

const LOCATION_TEXT: Record<LocationStatus, string> = {
  idle: 'Slå på posisjon for å jakte på skip i farvannet rundt deg.',
  requesting: 'Finner posisjonen din …',
  granted: 'Du spiller i farvannet rundt deg.',
  denied:
    'Posisjon er avslått, så du spiller fra Ålesund. Tillat posisjon i nettleseren for å spille der du er.',
  unavailable: 'Vi fant ikke posisjonen din, så du spiller fra Ålesund.',
  unsupported: 'Nettleseren din deler ikke posisjon, så du spiller fra Ålesund.',
}

export function StartScreen(props: StartScreenProps) {
  const { progress, plan, dataInfo } = props
  const dailyBest = progress.daily[plan.dateKey]
  const ageMs = dataInfo ? props.now - dataInfo.generatedAt : 0
  const canAskLocation = props.locationStatus === 'idle' || props.locationStatus === 'unavailable'

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col lg:flex-row">
      {/* Mobile header floating over the map */}
      <header className="pointer-events-auto flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),0.75rem)] lg:hidden">
        <div className="flex items-center gap-2.5">
          <LogoMark className="size-10" />
          <Wordmark className="text-xl" />
        </div>
        <SettingsButtons {...props} />
      </header>

      <main
        className="pointer-events-auto mt-auto max-h-[78dvh] w-full overflow-y-auto rounded-t-3xl border-t border-sea-600/70 bg-sea-950/95 px-4 pt-5 pb-[max(env(safe-area-inset-bottom),1rem)] shadow-[0_-20px_60px_-20px_rgb(0_0_0/0.8)] backdrop-blur motion-safe:animate-rise lg:m-6 lg:mt-6 lg:max-h-[calc(100dvh-3rem)] lg:w-[25rem] lg:rounded-3xl lg:border lg:p-7"
        aria-labelledby="start-title"
      >
        <div className="mb-6 hidden items-center justify-between lg:flex">
          <div className="flex items-center gap-3">
            <LogoMark className="size-14" animated />
            <Wordmark className="text-2xl" />
          </div>
          <SettingsButtons {...props} />
        </div>

        <h1
          id="start-title"
          className="font-display text-[1.7rem] leading-tight font-bold sm:text-3xl"
        >
          Finn skipet før lyset slukner.
        </h1>
        <p className="mt-2 text-mist">
          Et radarspill på <strong className="text-foam">ekte skipstrafikk</strong> langs
          norskekysten. Les kartet, finn riktig skip – raskt.
        </p>

        {props.notice ? (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-beacon/40 bg-beacon/10 px-3 py-2 text-sm text-foam"
          >
            {props.notice}
          </p>
        ) : null}

        <button
          type="button"
          className="btn-primary mt-5 w-full text-lg"
          onClick={props.onPlay}
          disabled={props.busy}
        >
          <RadarIcon className="size-5" />
          {props.busy ? 'Gjør klar …' : 'Start jakten'}
        </button>

        <section
          aria-labelledby="daily-title"
          className="chart-grid mt-4 rounded-2xl border border-signal/30 bg-sea-900 p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2
                id="daily-title"
                className="flex items-center gap-2 font-display text-sm font-bold tracking-[0.18em] text-signal uppercase"
              >
                <CalendarIcon className="size-4" /> Dagens utfordring
              </h2>
              <p className="mt-1 text-sm text-mist">
                Fullfør dagens maritime utfordring · {formatDateNb(plan.dateKey)} ·{' '}
                {plan.harbour.name}
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm">
            {dailyBest === undefined ? (
              <span className="text-mist">Ikke spilt i dag ennå.</span>
            ) : (
              <>
                Din beste i dag:{' '}
                <strong className="font-display text-lg text-beacon">
                  {formatScore(dailyBest)}
                </strong>
              </>
            )}
          </p>
          <button
            type="button"
            className="btn-secondary mt-3 w-full"
            onClick={props.onPlayDaily}
            disabled={props.busy}
          >
            {dailyBest === undefined ? 'Spill dagens' : 'Prøv igjen'}
          </button>
        </section>

        <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat
            label="Rekord"
            value={formatScore(progress.highScore)}
            icon={<TrophyIcon className="size-4 text-beacon" />}
          />
          <Stat label="Beste rekke" value={String(progress.bestStreak)} />
          <Stat label="Spill" value={String(progress.gamesPlayed)} />
        </dl>

        <div className="mt-4 flex items-start gap-3 rounded-xl border border-sea-700 bg-sea-900/70 p-3 text-sm">
          <PinIcon className="mt-0.5 size-5 shrink-0 text-signal" />
          <div className="flex-1">
            <p className="font-semibold">{props.locationLabel}</p>
            <p className="text-mist">{LOCATION_TEXT[props.locationStatus]}</p>
            {canAskLocation ? (
              <button
                type="button"
                className="mt-2 font-semibold text-signal underline underline-offset-4 hover:text-foam"
                onClick={props.onRequestLocation}
              >
                Bruk posisjonen min
              </button>
            ) : null}
          </div>
        </div>

        <button type="button" className="btn-ghost mt-3 w-full" onClick={props.onHowTo}>
          <InfoIcon className="size-5" /> Slik spiller du
        </button>

        <p className="mt-3 text-center text-xs text-mist">
          {dataInfo ? (
            <>
              <span
                className={`mr-1.5 inline-block size-2 rounded-full ${props.dataInfo?.degraded || ageMs > 3_600_000 ? 'bg-beacon' : 'bg-signal'}`}
                aria-hidden="true"
              />
              {formatScore(dataInfo.vesselCount)} skip på radaren · AIS-data oppdatert{' '}
              {formatAge(ageMs)}
            </>
          ) : null}
        </p>
        <MapCredits className="mt-1 text-center" />
        <p className="mt-1 text-center text-[0.68rem] text-mist">
          Uoffisielt hobbyspill – ikke tilknyttet Kystverket.
        </p>
      </main>
    </div>
  )
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-sea-700 bg-sea-900/70 px-2 py-2.5">
      <dt className="label-caps flex items-center justify-center gap-1 text-[0.65rem]">
        {icon}
        {label}
      </dt>
      <dd className="mt-0.5 font-display text-lg font-bold">{value}</dd>
    </div>
  )
}

function SettingsButtons({
  settings,
  onToggleSound,
  onToggleChart,
}: Pick<StartScreenProps, 'settings' | 'onToggleSound' | 'onToggleChart'>) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        className="btn-secondary min-h-11 px-3"
        onClick={onToggleChart}
        aria-pressed={settings.nauticalChart}
        title="Kartverkets sjøkart"
      >
        <ChartIcon className="size-5" />
        <span className="sr-only">Vis Kartverkets sjøkart</span>
      </button>
      <button
        type="button"
        className="btn-secondary min-h-11 px-3"
        onClick={onToggleSound}
        aria-pressed={settings.sound}
        title="Lyd"
      >
        <SoundIcon muted={!settings.sound} className="size-5" />
        <span className="sr-only">Lydeffekter</span>
      </button>
    </div>
  )
}
