import { describe, expect, it } from 'vitest'
import { generateMockDataset } from '../../data/sources/mock/generate'
import { computePeriod } from '../../metrics'
import { wholePercents } from './categories'
import { teamsCsv } from './csv'
import { buildHighlights, pickHighlights } from './highlights'
import { buildInsights, insightsForTeam } from './insights'
import { healthBands } from './Overview'
import { teamRows } from './teamRows'
import type { Values } from '../../metrics'

const values = (patch: Partial<Values>): Values =>
  ({
    sayDo: null, scopeChange: null, velocity: null, velocityCv: null, goalHitRate: null, throughput: null,
    throughputCv: null, cycleP50: null, cycleP85: null, leadP85: null, wip: null, ageingWipShare: null,
    bugRatio: null, healthIndex: null, pulseScore: null, okrShare: null, deliveryForecast: null,
    forecastAccuracy: null, ...patch,
  }) as Values

describe('wholePercents', () => {
  it('always adds up to exactly 100', () => {
    const r = wholePercents({ a: 1 / 3, b: 1 / 3, c: 1 / 3 })!
    expect(r.a + r.b + r.c).toBe(100)
    const s = wholePercents({ a: 0.505, b: 0.495, c: 0 })!
    expect(s.a + s.b + s.c).toBe(100)
  })
  it('is null without data', () => expect(wholePercents(null)).toBeNull())
})

describe('insight rules', () => {
  const run = (cur: Partial<Values>, prev: Partial<Values> = {}, type: 'scrum' | 'kanban' = 'scrum') =>
    insightsForTeam('T', type, values(cur), values(prev))
  it('added scope beats the plain Say/Do rule', () => {
    const r = run({ scopeChange: 0.3, sayDo: 0.68 })
    expect(r.map((i) => i.title)).toEqual(['T: added scope is eroding commitments'])
    expect(r[0].body).toBe('30% of the commitment was added mid-sprint and Say/Do is 68%.')
  })
  it('flags commitments out of reach when scope is calm', () => {
    expect(run({ scopeChange: 0.1, sayDo: 0.6 })[0].title).toBe('T: commitments consistently out of reach')
  })
  it('slowing flow is attention above 15 days, otherwise watch', () => {
    expect(run({ cycleP85: 16 }, { cycleP85: 11 })[0].tone).toBe('attention')
    expect(run({ cycleP85: 12 }, { cycleP85: 8 })[0].tone).toBe('watch')
  })
  it('needs a previous value to compare', () => {
    expect(run({ cycleP85: 30, bugRatio: 0.5, throughput: 1 })).toEqual([])
  })
  it('Scrum-only rules skip Kanban teams', () => {
    expect(run({ sayDo: 0.5, velocityCv: 0.5 }, {}, 'kanban')).toEqual([])
  })
  it('sorts attention, watch, then positive', () => {
    const rows = [
      { squad: { id: 'a', name: 'A', teamType: 'scrum' }, current: { values: values({ cycleP85: 6 }) }, previous: { values: values({ cycleP85: 10 }) } },
      { squad: { id: 'b', name: 'B', teamType: 'scrum' }, current: { values: values({ sayDo: 0.5 }) }, previous: { values: values({}) } },
    ] as never
    expect(buildInsights(rows).map((i) => i.tone)).toEqual(['attention', 'positive'])
  })
})

describe('highlight picking', () => {
  const c = (squadId: string, weight: number) => ({ squadId, weight, metric: 'sayDo' }) as never
  it('takes the biggest drop, the biggest win, then the larger next one, preferring new teams', () => {
    const drops = [c('a', 40), c('a', 30), c('c', 5)]
    const wins = [c('b', 35), c('b', 20)]
    const picked = pickHighlights(drops, wins) as unknown as { squadId: string; weight: number }[]
    expect(picked.map((p) => [p.squadId, p.weight])).toEqual([['a', 40], ['b', 35], ['c', 5]])
  })
  it('copes with no drops or no wins', () => {
    expect(pickHighlights([], [])).toEqual([])
    expect(pickHighlights([], [c('a', 30)])).toHaveLength(1)
  })
})

describe('overview on the seeded dataset', () => {
  const dataset = generateMockDataset()
  const ids = dataset.squads.map((s) => s.id)
  const { current } = computePeriod(dataset, ids, 90)
  const rows = teamRows(dataset, ids, 90)
  const name = (id: string) => dataset.squads.find((s) => s.id === id)!.name

  it('lands near the reference tiles (within 15%)', () => {
    const near = (v: number | null, ref: number) => expect(Math.abs(v! - ref) / ref).toBeLessThan(0.15)
    near(current.values.healthIndex, 86)
    near(current.values.pulseScore, 3.6)
    near(current.values.leadP85, 20)
    near(current.values.okrShare, 0.5)
    expect(rows).toHaveLength(12)
  })
  it('puts Borealis, Granite and Fjord among the insights', () => {
    const teams = buildInsights(rows).slice(0, 6).map((i) => name(i.squadId))
    expect(teams).toEqual(expect.arrayContaining(['Borealis', 'Granite', 'Fjord']))
  })
  it('counts teams by their own health index band', () => {
    const b = healthBands(rows)
    expect(b['on-track'] + b.watch + b['needs-attention']).toBeLessThanOrEqual(12)
    expect(b['on-track']).toBe(rows.filter((r) => (r.current.values.healthIndex ?? 0) >= 80).length)
    expect(b['needs-attention']).toBe(rows.filter((r) => r.current.values.healthIndex !== null && r.current.values.healthIndex < 50).length)
  })
  it('categories add up to 100', () => {
    const w = wholePercents(current.categories)!
    expect(Object.values(w).reduce((a, b) => a + b, 0)).toBe(100)
  })
  it('exports one CSV line per team plus the header', () => {
    expect(teamsCsv(rows).split('\n')).toHaveLength(13)
  })
  it('skips highlights with no earlier window', () => {
    expect(buildHighlights(dataset, rows, 180)).toEqual([])
  })
})
