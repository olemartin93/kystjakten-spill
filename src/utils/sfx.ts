/** Tiny synthesized sound effects (no audio files). Silently does nothing where Web Audio is unavailable. */
type Sound = 'tick' | 'correct' | 'wrong' | 'start' | 'select'

let ctx: AudioContext | null = null

function audio(): AudioContext | null {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function tone(
  ac: AudioContext,
  freq: number,
  start: number,
  duration: number,
  type: OscillatorType,
  gain = 0.08,
): void {
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, ac.currentTime + start)
  g.gain.setValueAtTime(0.0001, ac.currentTime + start)
  g.gain.exponentialRampToValueAtTime(gain, ac.currentTime + start + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + start + duration)
  osc.connect(g).connect(ac.destination)
  osc.start(ac.currentTime + start)
  osc.stop(ac.currentTime + start + duration + 0.02)
}

export function playSound(sound: Sound, enabled: boolean): void {
  if (!enabled) return
  const ac = audio()
  if (!ac) return
  switch (sound) {
    case 'tick':
      tone(ac, 880, 0, 0.05, 'square', 0.03)
      break
    case 'select':
      tone(ac, 660, 0, 0.06, 'sine', 0.05)
      break
    case 'start':
      tone(ac, 440, 0, 0.12, 'sine')
      tone(ac, 660, 0.12, 0.18, 'sine')
      break
    case 'correct':
      tone(ac, 660, 0, 0.1, 'triangle', 0.1)
      tone(ac, 990, 0.1, 0.22, 'triangle', 0.1)
      break
    case 'wrong':
      tone(ac, 196, 0, 0.28, 'sawtooth', 0.05)
      break
  }
}
