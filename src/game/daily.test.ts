import { describe, expect, it } from 'vitest'
import { NOW, variedPool } from '../test/fixtures'
import { generateChallenge } from './challenges'
import { canonicalPool, dailyPlan, dailyRoundRng } from './daily'

describe('daily challenge', () => {
  it('is identical for the same date', () => {
    expect(dailyPlan('2026-11-17')).toEqual(dailyPlan('2026-11-17'))
  })

  it('differs between days', () => {
    const days = ['2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21']
    const signatures = new Set(
      days.map((d) => JSON.stringify([dailyPlan(d).harbour.id, dailyPlan(d).kinds])),
    )
    expect(signatures.size).toBeGreaterThan(1)
  })

  it('has five distinct challenge kinds', () => {
    const plan = dailyPlan('2026-11-17')
    expect(plan.kinds).toHaveLength(5)
    expect(new Set(plan.kinds).size).toBe(5)
  })

  it('picks the same fleet for everyone given the same data, regardless of input order', () => {
    const plan = dailyPlan('2026-11-17')
    const pool = variedPool()
    const reversed = [...pool].reverse()
    const make = (p: typeof pool) =>
      generateChallenge(
        {
          rng: dailyRoundRng(plan, 1),
          pool: canonicalPool(p),
          now: NOW,
          fleetSize: 7,
          roundId: 'd1',
        },
        plan.kinds.slice(0, 1),
      )
    const a = make(pool)
    const b = make(reversed)
    expect(a?.fleet.map((v) => v.id)).toEqual(b?.fleet.map((v) => v.id))
    expect(a?.correctIds).toEqual(b?.correctIds)
  })
})
