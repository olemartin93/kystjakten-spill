import { evaluateAnswer } from './challenges'
import type { ScoreBreakdown } from './scoring'
import { calculateScore } from './scoring'
import type { Challenge, Evaluation, GameMode } from './types'

export interface GameConfig {
  mode: GameMode
  totalRounds: number
  roundSeconds: number
  lives: number
}

export const CLASSIC_CONFIG: GameConfig = {
  mode: 'classic',
  totalRounds: 10,
  roundSeconds: 25,
  lives: 3,
}
export const DAILY_CONFIG: GameConfig = {
  mode: 'daily',
  totalRounds: 5,
  roundSeconds: 25,
  lives: 5,
}

export type GamePhase = 'ready' | 'playing' | 'reveal' | 'gameover'

export interface RoundRecord {
  challenge: Challenge
  pickedId: string | null
  evaluation: Evaluation
  score: ScoreBreakdown
  elapsedMs: number
  timedOut: boolean
  streak: number
}

export interface GameState {
  config: GameConfig
  phase: GamePhase
  /** 1-based number of the current (or next) round. */
  round: number
  challenge: Challenge | null
  roundStartedAt: number
  score: number
  streak: number
  bestStreak: number
  lives: number
  history: RoundRecord[]
}

export function createGame(config: GameConfig): GameState {
  return {
    config,
    phase: 'ready',
    round: 1,
    challenge: null,
    roundStartedAt: 0,
    score: 0,
    streak: 0,
    bestStreak: 0,
    lives: config.lives,
    history: [],
  }
}

export function beginRound(state: GameState, challenge: Challenge, now: number): GameState {
  if (state.phase !== 'ready') return state
  return { ...state, phase: 'playing', challenge, roundStartedAt: now }
}

export function remainingMs(state: GameState, now: number): number {
  if (state.phase !== 'playing') return 0
  const total = state.config.roundSeconds * 1000
  // Clamp both ways: a clock read slightly before the round started must not show extra time.
  return Math.min(total, Math.max(0, total - (now - state.roundStartedAt)))
}

/** Submit a pick (or `null` when time ran out). Ignored unless a round is in progress. */
export function submitAnswer(state: GameState, pickedId: string | null, now: number): GameState {
  if (state.phase !== 'playing' || !state.challenge) return state
  const challenge = state.challenge
  const remaining = remainingMs(state, now)
  const timedOut = pickedId === null || remaining <= 0
  const evaluation: Evaluation =
    pickedId === null
      ? {
          ...evaluateAnswer(challenge, challenge.fleet[0]?.id ?? '', now),
          correct: false,
          accuracy: 0,
        }
      : evaluateAnswer(challenge, pickedId, now)
  const correct = evaluation.correct && !timedOut
  const streak = correct ? state.streak + 1 : 0
  const score = calculateScore({
    correct,
    accuracy: timedOut ? 0 : evaluation.accuracy,
    remainingSeconds: remaining / 1000,
    streak,
  })
  const record: RoundRecord = {
    challenge,
    pickedId,
    evaluation: { ...evaluation, correct },
    score,
    elapsedMs: Math.min(now - state.roundStartedAt, state.config.roundSeconds * 1000),
    timedOut,
    streak,
  }
  return {
    ...state,
    phase: 'reveal',
    score: state.score + score.total,
    streak,
    bestStreak: Math.max(state.bestStreak, streak),
    lives: correct ? state.lives : Math.max(0, state.lives - 1),
    history: [...state.history, record],
  }
}

export function isFinalRound(state: GameState): boolean {
  return state.lives <= 0 || state.round >= state.config.totalRounds
}

/** Move on from the reveal screen to the next round or to game over. */
export function advance(state: GameState): GameState {
  if (state.phase !== 'reveal') return state
  if (isFinalRound(state)) return { ...state, phase: 'gameover', challenge: null }
  return { ...state, phase: 'ready', round: state.round + 1, challenge: null }
}

/** End the game early (e.g. no more vessels available). */
export function endGame(state: GameState): GameState {
  return { ...state, phase: 'gameover', challenge: null }
}

export interface GameSummary {
  score: number
  rounds: number
  correct: number
  bestStreak: number
  averageAnswerSeconds: number
}

export function summarize(state: GameState): GameSummary {
  const answered = state.history.filter((r) => !r.timedOut)
  return {
    score: state.score,
    rounds: state.history.length,
    correct: state.history.filter((r) => r.evaluation.correct).length,
    bestStreak: state.bestStreak,
    averageAnswerSeconds:
      answered.length === 0
        ? 0
        : answered.reduce((s, r) => s + r.elapsedMs, 0) / answered.length / 1000,
  }
}
