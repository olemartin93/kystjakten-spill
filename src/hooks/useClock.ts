import { useEffect, useState } from 'react'

/** Current time, refreshed every `intervalMs`. Keeps render functions pure. */
export function useClock(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(timer)
  }, [intervalMs])
  return now
}
