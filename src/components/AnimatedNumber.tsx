import { useEffect, useRef, useState } from 'react'
import { formatScore } from '../utils/format'

/** Counts up to `value` – a small reward every time the score changes. */
export function AnimatedNumber({
  value,
  durationMs = 700,
  reducedMotion,
}: {
  value: number
  durationMs?: number
  reducedMotion: boolean
}) {
  const [shown, setShown] = useState(value)
  const fromRef = useRef(value)

  useEffect(() => {
    const from = fromRef.current
    if (reducedMotion || from === value) {
      fromRef.current = value
      setShown(value)
      return
    }
    let raf = 0
    const start = performance.now()
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / durationMs)
      const eased = 1 - (1 - p) ** 3
      setShown(Math.round(from + (value - from) * eased))
      if (p < 1) raf = requestAnimationFrame(step)
      else fromRef.current = value
    }
    raf = requestAnimationFrame(step)
    return () => {
      cancelAnimationFrame(raf)
      fromRef.current = value
    }
  }, [value, durationMs, reducedMotion])

  return <>{formatScore(shown)}</>
}
