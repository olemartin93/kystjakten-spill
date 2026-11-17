import type { AisProvider } from './provider'
import { createSnapshotProvider } from './provider'

export type { AisProvider } from './provider'
export { AisError, AIS_ERROR_MESSAGE } from './errors'
export { projectPosition, vesselDirection } from './normalize'
export { CATEGORY_COLOR, CATEGORY_GLYPH, CATEGORY_LABEL } from './shipTypes'

/**
 * Picks the AIS provider for this build.
 *
 * - Production: the static snapshot published by the deploy workflow (data/ais.json).
 * - `npm run dev:mock`: a clearly simulated, development-only fleet. Vite removes this
 *   branch (and the mock module) from production bundles because `import.meta.env.MODE`
 *   is replaced at build time.
 */
export async function getAisProvider(): Promise<AisProvider> {
  if (import.meta.env.MODE === 'mock') {
    const { createDevMockProvider } = await import('./dev/devMockProvider')
    return createDevMockProvider()
  }
  const url = import.meta.env.VITE_AIS_SNAPSHOT_URL ?? `${import.meta.env.BASE_URL}data/ais.json`
  return createSnapshotProvider({ url })
}
