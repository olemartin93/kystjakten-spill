import { useCallback, useEffect, useRef, useState } from 'react'
import type { AisErrorCode } from '../services/ais/errors'
import { toAisError } from '../services/ais/errors'
import { getAisProvider } from '../services/ais'
import type { AisSnapshot } from '../types/vessel'

export type AisState =
  | { status: 'loading'; snapshot: null; error: null }
  | { status: 'ready'; snapshot: AisSnapshot; error: AisErrorCode | null }
  | { status: 'error'; snapshot: null; error: AisErrorCode }

/** Snapshots are rebuilt by the deploy workflow roughly every 15 minutes; checking every 5 is plenty. */
const REFRESH_MS = 5 * 60_000

export function useAisData(): AisState & { reload: () => void } {
  const [state, setState] = useState<AisState>({ status: 'loading', snapshot: null, error: null })
  const inFlight = useRef<AbortController | null>(null)

  /** Fetch in the background; only async state updates, so it is safe to call from effects. */
  const fetchSnapshot = useCallback(async () => {
    inFlight.current?.abort()
    const controller = new AbortController()
    inFlight.current = controller
    try {
      const provider = await getAisProvider()
      const snapshot = await provider.fetchSnapshot(controller.signal)
      if (!controller.signal.aborted) setState({ status: 'ready', snapshot, error: null })
    } catch (error) {
      if (controller.signal.aborted) return
      const code = toAisError(error).code
      // A failed refresh keeps the game running on the data we already have.
      setState((prev) =>
        prev.status === 'ready'
          ? { ...prev, error: code }
          : { status: 'error', snapshot: null, error: code },
      )
    }
  }, [])

  useEffect(() => {
    // Subscribing to an external source: state is only set after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchSnapshot()
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void fetchSnapshot()
    }, REFRESH_MS)
    return () => {
      window.clearInterval(timer)
      inFlight.current?.abort()
    }
  }, [fetchSnapshot])

  const reload = useCallback(() => {
    setState({ status: 'loading', snapshot: null, error: null })
    void fetchSnapshot()
  }, [fetchSnapshot])
  return { ...state, reload }
}
