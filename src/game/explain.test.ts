import { describe, expect, it } from 'vitest'
import { NOW, vessel } from '../test/fixtures'
import { beginRound, CLASSIC_CONFIG, createGame, submitAnswer } from './engine'
import { keyFact, resultHeadline } from './explain'
import type { Challenge, ChallengeKind } from './types'

function recordFor(kind: ChallengeKind, picked: 'right' | 'wrong' | null) {
  const fleet = [
    vessel({ speed: 20, course: 90, length: 200 }),
    vessel({ speed: 15, course: 270, length: 50 }),
  ]
  const challenge: Challenge = {
    id: 'x',
    kind,
    title: '',
    prompt: '',
    hint: '',
    fleet,
    correctIds: [fleet[0]?.id ?? ''],
    target:
      kind === 'closest'
        ? { latitude: fleet[0]?.latitude ?? 0, longitude: fleet[0]?.longitude ?? 0 }
        : null,
    params: { direction: 90 },
  }
  const id =
    picked === null ? null : picked === 'right' ? (fleet[0]?.id ?? '') : (fleet[1]?.id ?? '')
  const state = submitAnswer(beginRound(createGame(CLASSIC_CONFIG), challenge, NOW), id, NOW + 1000)
  const record = state.history[0]
  if (!record) throw new Error('no record')
  return { record, fleet }
}

describe('result explanations', () => {
  it('describes the relevant fact per challenge', () => {
    const { record, fleet } = recordFor('fastest', 'right')
    expect(keyFact(record, fleet[0] ?? vessel(), NOW)).toBe('20,0 kn')
    const dir = recordFor('direction', 'right')
    expect(keyFact(dir.record, dir.fleet[0] ?? vessel(), NOW)).toBe('kurs 090° (øst)')
    const len = recordFor('longest', 'right')
    expect(keyFact(len.record, len.fleet[0] ?? vessel(), NOW)).toBe('200 m')
    const near = recordFor('closest', 'right')
    expect(keyFact(near.record, near.fleet[0] ?? vessel(), NOW)).toMatch(/fra bøyen$/)
  })

  it('headlines', () => {
    expect(resultHeadline(recordFor('fastest', 'right').record)).toBe('Riktig!')
    expect(resultHeadline(recordFor('fastest', null).record)).toBe('Tiden er ute!')
    expect(resultHeadline(recordFor('fastest', 'wrong').record)).toBe('Nesten!')
  })
})
