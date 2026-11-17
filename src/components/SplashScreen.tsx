import { LogoMark, Wordmark } from './Logo'

export function SplashScreen({ message = 'Henter skip fra kysten …' }: { message?: string }) {
  return (
    <div
      className="chart-grid absolute inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-sea-950"
      role="status"
      aria-live="polite"
    >
      <LogoMark animated className="size-28 drop-shadow-[0_0_30px_rgb(255_194_75/0.25)]" />
      <Wordmark className="text-3xl" />
      <p className="flex items-center gap-3 text-mist">
        <span
          className="size-2 rounded-full bg-signal motion-safe:animate-pulse"
          aria-hidden="true"
        />
        {message}
      </p>
    </div>
  )
}
