import type { AisErrorCode } from '../services/ais/errors'
import { AIS_ERROR_MESSAGE } from '../services/ais/errors'
import { LogoMark } from './Logo'

export function ErrorPanel({ code, onRetry }: { code: AisErrorCode; onRetry: () => void }) {
  const message = AIS_ERROR_MESSAGE[code]
  return (
    <div className="chart-grid absolute inset-0 z-50 grid place-items-center bg-sea-950 p-6">
      <div role="alert" className="panel max-w-sm p-6 text-center">
        <LogoMark className="mx-auto size-16 opacity-80 grayscale-[40%]" />
        <h1 className="mt-4 font-display text-2xl font-bold">{message.title}</h1>
        <p className="mt-2 text-mist">{message.body}</p>
        <button type="button" className="btn-primary mt-5 w-full" onClick={onRetry}>
          Prøv igjen
        </button>
        <p className="mt-4 text-xs text-mist">AIS-data: Kystverket via BarentsWatch (NLOD).</p>
      </div>
    </div>
  )
}
