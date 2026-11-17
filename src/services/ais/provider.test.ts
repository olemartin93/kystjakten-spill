import { describe, expect, it } from 'vitest'
import type { AisError } from './errors'
import { AIS_ERROR_MESSAGE } from './errors'
import { createSnapshotProvider } from './provider'

const validBody = {
  version: 1,
  generatedAt: '2026-11-17T12:00:00Z',
  vessels: [[257123450, 'A', 62.47, 6.15, 12, 90, 90, 70, 100, null, 1_790_000_000]],
}

const respond =
  (body: unknown, status = 200): typeof fetch =>
  () =>
    Promise.resolve(
      new Response(typeof body === 'string' ? body : JSON.stringify(body), { status }),
    )

async function errorCode(promise: Promise<unknown>): Promise<string> {
  try {
    await promise
    return 'no error'
  } catch (e) {
    return (e as AisError).code
  }
}

describe('snapshot provider error handling', () => {
  it('returns normalized vessels', async () => {
    const p = createSnapshotProvider({
      url: '/x',
      fetchImpl: respond(validBody),
      isOnline: () => true,
    })
    const s = await p.fetchSnapshot()
    expect(s.vessels[0]?.id).toBe('257123450')
  })

  it('maps 404 to "unavailable"', async () => {
    const p = createSnapshotProvider({
      url: '/x',
      fetchImpl: respond('nope', 404),
      isOnline: () => true,
    })
    expect(await errorCode(p.fetchSnapshot())).toBe('unavailable')
  })

  it('maps server errors to "unavailable"', async () => {
    const p = createSnapshotProvider({
      url: '/x',
      fetchImpl: respond('boom', 503),
      isOnline: () => true,
    })
    expect(await errorCode(p.fetchSnapshot())).toBe('unavailable')
  })

  it('maps malformed JSON to "invalid"', async () => {
    const p = createSnapshotProvider({
      url: '/x',
      fetchImpl: respond('{oops'),
      isOnline: () => true,
    })
    expect(await errorCode(p.fetchSnapshot())).toBe('invalid')
  })

  it('maps network failures to "network"', async () => {
    const failing = (() => Promise.reject(new TypeError('Failed to fetch'))) as typeof fetch
    const p = createSnapshotProvider({ url: '/x', fetchImpl: failing, isOnline: () => true })
    expect(await errorCode(p.fetchSnapshot())).toBe('network')
  })

  it('times out slow responses', async () => {
    const hanging = ((_: unknown, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('aborted', 'AbortError')),
        )
      })) as typeof fetch
    const p = createSnapshotProvider({
      url: '/x',
      fetchImpl: hanging,
      timeoutMs: 20,
      isOnline: () => true,
    })
    expect(await errorCode(p.fetchSnapshot())).toBe('timeout')
  })

  it('reports "offline" when offline and nothing is cached', async () => {
    const failing = (() => Promise.reject(new TypeError('offline'))) as typeof fetch
    const p = createSnapshotProvider({ url: '/x', fetchImpl: failing, isOnline: () => false })
    expect(await errorCode(p.fetchSnapshot())).toBe('offline')
  })

  it('still plays from the service-worker cache while offline', async () => {
    const p = createSnapshotProvider({
      url: '/x',
      fetchImpl: respond(validBody),
      isOnline: () => false,
    })
    expect((await p.fetchSnapshot()).vessels).toHaveLength(1)
  })

  it('has a friendly message for every error code (no raw errors shown to players)', () => {
    for (const msg of Object.values(AIS_ERROR_MESSAGE)) {
      expect(msg.title.length).toBeGreaterThan(3)
      expect(msg.body).not.toMatch(/error|exception|http|status/i)
    }
  })
})
