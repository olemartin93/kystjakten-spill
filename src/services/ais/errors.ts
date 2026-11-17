export type AisErrorCode = 'offline' | 'network' | 'timeout' | 'unavailable' | 'invalid' | 'empty'

/** Error type used across the AIS layer. `code` is safe to branch on; never show `cause` to players. */
export class AisError extends Error {
  readonly code: AisErrorCode

  constructor(code: AisErrorCode, message?: string, options?: { cause?: unknown }) {
    super(message ?? code, options)
    this.name = 'AisError'
    this.code = code
  }
}

export function toAisError(error: unknown): AisError {
  if (error instanceof AisError) return error
  if (
    error instanceof DOMException &&
    (error.name === 'AbortError' || error.name === 'TimeoutError')
  ) {
    return new AisError('timeout', 'Request timed out', { cause: error })
  }
  return new AisError('network', 'Network request failed', { cause: error })
}

/** Friendly Norwegian message for each error class. */
export const AIS_ERROR_MESSAGE: Record<AisErrorCode, { title: string; body: string }> = {
  offline: {
    title: 'Du er offline',
    body: 'Fyrvakt trenger nett for å hente ferske skipsposisjoner. Koble til og prøv igjen.',
  },
  network: {
    title: 'Fikk ikke kontakt',
    body: 'Vi nådde ikke frem til skipsdataene akkurat nå. Sjekk nettforbindelsen og prøv igjen.',
  },
  timeout: {
    title: 'Det går tregt i dag',
    body: 'Skipsdataene bruker lang tid på å svare. Prøv igjen om et øyeblikk.',
  },
  unavailable: {
    title: 'Radaren er midlertidig nede',
    body: 'Det finnes ingen ferske AIS-data akkurat nå. Dataene oppdateres jevnlig – prøv igjen senere.',
  },
  invalid: {
    title: 'Uleselige skipsdata',
    body: 'Vi fikk data vi ikke klarte å tolke. Prøv igjen litt senere.',
  },
  empty: {
    title: 'Stille på sjøen',
    body: 'Vi fant ingen skip i dataene akkurat nå. Prøv igjen om litt.',
  },
}
