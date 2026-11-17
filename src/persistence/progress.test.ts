import { describe, expect, it } from 'vitest'
import { loadProgress, recordResult, saveProgress } from './progress'
import type { KeyValueStore } from './storage'

const memory = (): KeyValueStore & { data: Map<string, string> } => {
  const data = new Map<string, string>()
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) }
}

describe('progress persistence', () => {
  it('starts empty and survives corrupt storage', () => {
    const store = memory()
    store.data.set('fyrvakt:progress-v1', '{not json')
    expect(loadProgress(store)).toEqual({ highScore: 0, gamesPlayed: 0, bestStreak: 0, daily: {} })
  })

  it('records classic high scores', () => {
    const p0 = loadProgress(memory())
    const r1 = recordResult(p0, {
      mode: 'classic',
      score: 4200,
      bestStreak: 3,
      dateKey: '2026-11-17',
    })
    expect(r1.isNewHighScore).toBe(true)
    const r2 = recordResult(r1.progress, {
      mode: 'classic',
      score: 1000,
      bestStreak: 1,
      dateKey: '2026-11-17',
    })
    expect(r2.isNewHighScore).toBe(false)
    expect(r2.progress.highScore).toBe(4200)
    expect(r2.progress.gamesPlayed).toBe(2)
    expect(r2.progress.bestStreak).toBe(3)
  })

  it('keeps the best daily score per date', () => {
    let p = loadProgress(memory())
    p = recordResult(p, {
      mode: 'daily',
      score: 3000,
      bestStreak: 2,
      dateKey: '2026-11-17',
    }).progress
    const worse = recordResult(p, {
      mode: 'daily',
      score: 2000,
      bestStreak: 2,
      dateKey: '2026-11-17',
    })
    expect(worse.isNewDailyBest).toBe(false)
    expect(worse.progress.daily['2026-11-17']).toBe(3000)
    expect(worse.progress.highScore).toBe(0)
  })

  it('round-trips through storage', () => {
    const store = memory()
    const p = recordResult(loadProgress(store), {
      mode: 'daily',
      score: 10,
      bestStreak: 0,
      dateKey: '2026-11-17',
    })
    saveProgress(p.progress, store)
    expect(loadProgress(store).daily).toEqual({ '2026-11-17': 10 })
  })

  it('does not crash when storage throws', () => {
    const broken: KeyValueStore = {
      getItem: () => {
        throw new Error('denied')
      },
      setItem: () => {
        throw new Error('quota')
      },
    }
    expect(loadProgress(broken).highScore).toBe(0)
    expect(() => saveProgress(loadProgress(broken), broken)).not.toThrow()
  })
})
