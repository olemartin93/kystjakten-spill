import type { KeyValueStore } from './storage'
import { readJson, writeJson } from './storage'

export interface Progress {
  highScore: number
  gamesPlayed: number
  bestStreak: number
  /** Best daily score keyed by YYYY-MM-DD. */
  daily: Record<string, number>
}

const EMPTY: Progress = { highScore: 0, gamesPlayed: 0, bestStreak: 0, daily: {} }
const KEY = 'progress-v1'
const MAX_DAILY_ENTRIES = 60

export function loadProgress(store?: KeyValueStore | null): Progress {
  const stored = readJson<Partial<Progress>>(KEY, {}, store)
  return {
    highScore: typeof stored.highScore === 'number' ? stored.highScore : 0,
    gamesPlayed: typeof stored.gamesPlayed === 'number' ? stored.gamesPlayed : 0,
    bestStreak: typeof stored.bestStreak === 'number' ? stored.bestStreak : 0,
    daily: stored.daily && typeof stored.daily === 'object' ? stored.daily : { ...EMPTY.daily },
  }
}

export interface RecordedResult {
  progress: Progress
  isNewHighScore: boolean
  isNewDailyBest: boolean
}

export function recordResult(
  progress: Progress,
  result: { mode: 'classic' | 'daily'; score: number; bestStreak: number; dateKey: string },
): RecordedResult {
  const isNewHighScore = result.mode === 'classic' && result.score > progress.highScore
  const previousDaily = progress.daily[result.dateKey]
  const isNewDailyBest =
    result.mode === 'daily' && (previousDaily === undefined || result.score > previousDaily)
  const daily = { ...progress.daily }
  if (isNewDailyBest) daily[result.dateKey] = result.score
  // Keep storage small: only the most recent days.
  const trimmed = Object.fromEntries(
    Object.entries(daily)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, MAX_DAILY_ENTRIES),
  )
  return {
    progress: {
      highScore: isNewHighScore ? result.score : progress.highScore,
      gamesPlayed: progress.gamesPlayed + 1,
      bestStreak: Math.max(progress.bestStreak, result.bestStreak),
      daily: trimmed,
    },
    isNewHighScore,
    isNewDailyBest,
  }
}

export const saveProgress = (progress: Progress, store?: KeyValueStore | null): void =>
  writeJson(KEY, progress, store)

export interface Settings {
  sound: boolean
  nauticalChart: boolean
}
const SETTINGS_KEY = 'settings-v1'
export const loadSettings = (): Settings => ({
  sound: true,
  nauticalChart: false,
  ...readJson<Partial<Settings>>(SETTINGS_KEY, {}),
})
export const saveSettings = (s: Settings): void => writeJson(SETTINGS_KEY, s)
