import { describe, expect, it } from 'vitest'
import { NOW, vessel } from '../test/fixtures'
import {
  advance,
  beginRound,
  CLASSIC_CONFIG,
  createGame,
  remainingMs,
  submitAnswer,
  summarize,
} from './engine'
import type { Challenge } from './types'

const fleet = [vessel({ speed: 20 }), vessel({ speed: 10 }), vessel({ speed: 5 })]
const challenge: Challenge = {
  id: 'c',
  kind: 'fastest',
  title: 'Raskest',
  prompt: 'Finn skipet som går raskest',
  hint: '',
  fleet,
  correctIds: [fleet[0]?.id ?? ''],
  target: null,
  params: {},
}
const right = fleet[0]?.id ?? ''
const wrong = fleet[2]?.id ?? ''

describe('game engine', () => {
  it('runs a round from ready → playing → reveal → ready', () => {
    let s = createGame(CLASSIC_CONFIG)
    expect(s.phase).toBe('ready')
    s = beginRound(s, challenge, NOW)
    expect(s.phase).toBe('playing')
    expect(remainingMs(s, NOW + 5000)).toBe(20_000)
    s = submitAnswer(s, right, NOW + 5000)
    expect(s.phase).toBe('reveal')
    expect(s.score).toBe(1000 + 20 * 25 + 500)
    expect(s.streak).toBe(1)
    s = advance(s)
    expect(s.phase).toBe('ready')
    expect(s.round).toBe(2)
  })

  it('never reports more time than the round length', () => {
    const s = beginRound(createGame(CLASSIC_CONFIG), challenge, NOW)
    expect(remainingMs(s, NOW - 10_000)).toBe(25_000)
    expect(remainingMs(s, NOW + 60_000)).toBe(0)
  })

  it('ignores answers outside a round', () => {
    const s = createGame(CLASSIC_CONFIG)
    expect(submitAnswer(s, right, NOW)).toBe(s)
  })

  it('builds streaks and resets them on a miss, costing a life', () => {
    let s = createGame(CLASSIC_CONFIG)
    for (let i = 0; i < 3; i++) {
      s = advance(submitAnswer(beginRound(s, challenge, NOW), right, NOW + 1000))
    }
    expect(s.streak).toBe(3)
    expect(s.history[2]?.score.multiplier).toBe(1.5)
    s = submitAnswer(beginRound(s, challenge, NOW), wrong, NOW + 1000)
    expect(s.streak).toBe(0)
    expect(s.bestStreak).toBe(3)
    expect(s.lives).toBe(CLASSIC_CONFIG.lives - 1)
  })

  it('a timeout scores nothing and costs a life', () => {
    let s = beginRound(createGame(CLASSIC_CONFIG), challenge, NOW)
    s = submitAnswer(s, null, NOW + 26_000)
    expect(s.history[0]?.timedOut).toBe(true)
    expect(s.score).toBe(0)
    expect(s.lives).toBe(CLASSIC_CONFIG.lives - 1)
  })

  it('a correct pick after the clock ran out does not count', () => {
    let s = beginRound(createGame(CLASSIC_CONFIG), challenge, NOW)
    s = submitAnswer(s, right, NOW + 30_000)
    expect(s.history[0]?.evaluation.correct).toBe(false)
  })

  it('ends the game when lives run out', () => {
    let s = createGame({ ...CLASSIC_CONFIG, lives: 2 })
    s = advance(submitAnswer(beginRound(s, challenge, NOW), wrong, NOW + 1000))
    expect(s.phase).toBe('ready')
    s = advance(submitAnswer(beginRound(s, challenge, NOW), wrong, NOW + 1000))
    expect(s.phase).toBe('gameover')
  })

  it('ends the game after the final round', () => {
    let s = createGame({ ...CLASSIC_CONFIG, totalRounds: 2 })
    s = advance(submitAnswer(beginRound(s, challenge, NOW), right, NOW + 1000))
    s = advance(submitAnswer(beginRound(s, challenge, NOW), right, NOW + 3000))
    expect(s.phase).toBe('gameover')
    const summary = summarize(s)
    expect(summary.correct).toBe(2)
    expect(summary.rounds).toBe(2)
    expect(summary.averageAnswerSeconds).toBe(2)
  })
})
