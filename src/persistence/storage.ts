/** Small, crash-proof wrapper around localStorage (private mode, quota and disabled storage are all handled). */
const PREFIX = 'fyrvakt:'

export interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

function defaultStore(): KeyValueStore | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

export function readJson<T>(
  key: string,
  fallback: T,
  store: KeyValueStore | null = defaultStore(),
): T {
  if (!store) return fallback
  try {
    const raw = store.getItem(PREFIX + key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

export function writeJson(
  key: string,
  value: unknown,
  store: KeyValueStore | null = defaultStore(),
): void {
  if (!store) return
  try {
    store.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // Storage full or blocked – progress just won't be remembered.
  }
}
