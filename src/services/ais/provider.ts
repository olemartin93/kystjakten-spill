import type { AisSnapshot } from '../../types/vessel'
import { AisError, toAisError } from './errors'
import { normalizeSnapshot } from './normalize'

/** Anything that can deliver a normalized AIS snapshot. The game never talks to an API directly. */
export interface AisProvider {
  readonly name: string
  fetchSnapshot(signal?: AbortSignal): Promise<AisSnapshot>
}

export interface SnapshotProviderOptions {
  url: string
  timeoutMs?: number
  fetchImpl?: typeof fetch
  isOnline?: () => boolean
}

/** Reads the pre-built snapshot that the deploy workflow publishes next to the app. */
export function createSnapshotProvider(options: SnapshotProviderOptions): AisProvider {
  const timeoutMs = options.timeoutMs ?? 15_000
  const doFetch = options.fetchImpl ?? ((input, init) => fetch(input, init))
  const isOnline = options.isOnline ?? (() => typeof navigator === 'undefined' || navigator.onLine)

  return {
    name: 'snapshot',
    async fetchSnapshot(signal) {
      if (!isOnline()) {
        // The service worker may still have a recent copy – try it, but report "offline" if not.
        try {
          return await load()
        } catch {
          throw new AisError('offline', 'Browser is offline')
        }
      }
      return load()

      async function load(): Promise<AisSnapshot> {
        const timeout = AbortSignal.timeout(timeoutMs)
        const combined = signal ? AbortSignal.any([signal, timeout]) : timeout
        let response: Response
        try {
          // "no-cache" revalidates with the server (ETag) so we never play on a stale HTTP-cached copy.
          response = await doFetch(options.url, { signal: combined, cache: 'no-cache' })
        } catch (error) {
          if (timeout.aborted)
            throw new AisError('timeout', 'Snapshot request timed out', { cause: error })
          throw toAisError(error)
        }
        if (response.status === 404) throw new AisError('unavailable', 'No snapshot published')
        if (!response.ok)
          throw new AisError('unavailable', `Snapshot request failed: ${response.status}`)
        let json: unknown
        try {
          json = await response.json()
        } catch (error) {
          throw new AisError('invalid', 'Snapshot is not valid JSON', { cause: error })
        }
        return normalizeSnapshot(json)
      }
    },
  }
}
