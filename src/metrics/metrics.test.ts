import { describe, expect, it } from 'vitest'
import type { Dataset, PulseCheck, Sprint, Squad } from '../data/model'
import { PULSE_DIMENSIONS } from '../data/model'
import { generateMockDataset } from '../data/sources/mock/generate'
import { improvement, scoreFor, signalFor } from './catalogue'
import { computeScorecard, computePeriod, healthIndex, teamSignal, type Values } from './compute'
import { forecastItems } from './forecast'
import { DAY_MS, toMs, windowEndingAt } from './periods'
import { pulseMovers } from './pulse'
import { cv, percentile, stdev } from './stats'
import { trend } from './trends'

const ASOF = '2026-06-30T00:00:00.000Z'
const asOfMs = toMs(ASOF)
const iso = (daysAgo: number) => new Date(asOfMs - daysAgo * DAY_MS).toISOString()

const squad = (id: string, teamType: Squad['teamType'] = 'scrum'): Squad => ({
  id, name: id, domainId: 'd', valueStreamId: 'v', deliveryLeadId: 'l', podId: null, teamType, boardKey: id,
})

const sprint = (squadId: string, daysAgo: number, committed: number, done: number, added = 0): Sprint => ({
  id: `${squadId}-${daysAgo}`, squadId, name: 's', startDate: iso(daysAgo + 14), endDate: iso(daysAgo),
  committedPoints: committed, completedCommittedPoints: done, addedPoints: added, completedAddedPoints: 0,
  removedPoints: 0, goal: 'g', goalMet: null,
})

const pulse = (squadId: string, daysAgo: number, respondents: number, score: number): PulseCheck => ({
  id: `${squadId}-${daysAgo}`, squadId, date: iso(daysAgo), respondents,
  scores: Object.fromEntries(PULSE_DIMENSIONS.map((d) => [d, score])) as PulseCheck['scores'],
})

const dataset = (patch: Partial<Dataset>): Dataset => ({
  asOf: ASOF,
  source: { id: 't', label: 't', isDummy: true },
  domains: [], valueStreams: [], deliveryLeads: [], pods: [],
  squads: [squad('a'), squad('b')], initiatives: [], workItems: [], sprints: [], pulseChecks: [],
  ...patch,
})

const emptyValues = (patch: Partial<Values>): Values =>
  ({
    sayDo: null, scopeChange: null, velocity: null, velocityCv: null, goalHitRate: null, throughput: null,
    throughputCv: null, cycleP50: null, cycleP85: null, leadP85: null, wip: null, ageingWipShare: null,
    bugRatio: null, healthIndex: null, pulseScore: null, okrShare: null, deliveryForecast: null,
    forecastAccuracy: null, ...patch,
  }) as Values

describe('stats', () => {
  it('interpolates percentiles linearly', () => {
    expect(percentile([1, 2, 3, 4], 50)).toBe(2.5)
    expect(percentile([10, 20], 85)).toBeCloseTo(18.5)
    expect(percentile([], 50)).toBeNull()
  })
  it('uses the sample standard deviation and CV', () => {
    expect(stdev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.138, 3)
    expect(cv([10, 10, 10])).toBe(0)
    expect(cv([0, 0])).toBeNull()
    expect(cv([5])).toBeNull()
  })
})

describe('Say/Do pooling', () => {
  it('weights by points rather than averaging team ratios', () => {
    // team a: 10/10 = 100%, team b: 30/100 = 30%. Pooled 40/110, not the mean of 65%.
    const ds = dataset({ sprints: [sprint('a', 5, 10, 10), sprint('b', 5, 100, 30)] })
    const w = windowEndingAt(asOfMs, 30)
    expect(computeScorecard(ds, ['a', 'b'], w).values.sayDo).toBeCloseTo(40 / 110)
  })
  it('counts only sprints ending inside the window', () => {
    const ds = dataset({ sprints: [sprint('a', 5, 10, 8), sprint('a', 40, 10, 0)] })
    expect(computeScorecard(ds, ['a'], windowEndingAt(asOfMs, 30)).values.sayDo).toBeCloseTo(0.8)
  })
})

describe('scoring anchors', () => {
  it('gives 100 at good, 50 at watch and 0 one band further out', () => {
    expect(scoreFor('sayDo', 0.8)).toBeCloseTo(100)
    expect(scoreFor('sayDo', 0.65)).toBeCloseTo(50)
    expect(scoreFor('sayDo', 0.5)).toBeCloseTo(0)
    expect(scoreFor('sayDo', 1)).toBe(100)
    expect(scoreFor('sayDo', 0.1)).toBe(0)
    expect(scoreFor('cycleP85', 10)).toBeCloseTo(100)
    expect(scoreFor('cycleP85', 15)).toBeCloseTo(50)
    expect(scoreFor('cycleP85', 20)).toBeCloseTo(0)
  })
  it('has no score without thresholds or a value', () => {
    expect(scoreFor('velocity', 40)).toBeNull()
    expect(scoreFor('sayDo', null)).toBeNull()
  })
  it('derives signals from thresholds in both directions', () => {
    expect(signalFor('sayDo', 0.8)).toBe('on-track')
    expect(signalFor('sayDo', 0.7)).toBe('watch')
    expect(signalFor('sayDo', 0.4)).toBe('needs-attention')
    expect(signalFor('bugRatio', 0.33)).toBe('needs-attention')
    expect(signalFor('velocity', 40)).toBeNull()
  })
  it('treats changes below display precision as unchanged', () => {
    expect(improvement('sayDo', 0.801, 0.804)).toBe('unchanged')
    expect(improvement('sayDo', 0.85, 0.8)).toBe('better')
    expect(improvement('bugRatio', 0.3, 0.2)).toBe('worse')
    expect(improvement('velocity', 50, 40)).toBeNull()
  })
})

describe('health index', () => {
  it('needs at least three scorable inputs', () => {
    expect(healthIndex(emptyValues({ sayDo: 0.8, cycleP85: 10 }), 'scrum')).toBeNull()
    expect(healthIndex(emptyValues({ sayDo: 0.8, cycleP85: 10, leadP85: 20 }), 'scrum')).toBeCloseTo(100)
    expect(healthIndex(emptyValues({ cycleP85: 15, leadP85: 28, pulseScore: 3.3 }), 'kanban')).toBeCloseTo(50)
  })
  it('averages teams so each counts once', () => {
    const perfect = emptyValues({ sayDo: 0.8, cycleP85: 10, leadP85: 20 })
    expect(healthIndex(perfect, 'scrum')).toBe(100)
    const items = (id: string, n: number) =>
      Array.from({ length: n }, (_, k) => ({
        key: `${id}${k}`, squadId: id, type: 'story' as const, category: 'None' as const, summary: '',
        storyPoints: null, initiativeId: null, createdAt: iso(25), startedAt: iso(22), doneAt: iso(10 + (k % 3)),
      }))
    const ds = dataset({
      squads: [squad('a'), squad('b')],
      workItems: [...items('a', 30), ...items('b', 3)],
      sprints: [sprint('a', 5, 10, 10), sprint('b', 5, 10, 10)],
    })
    const card = computeScorecard(ds, ['a', 'b'], windowEndingAt(asOfMs, 30))
    const hs = Object.values(card.teamHealth)
    expect(hs).toHaveLength(2)
    expect(card.values.healthIndex).toBeCloseTo((hs[0] + hs[1]) / 2)
  })
})

describe('team signal', () => {
  it('follows the any-attention / two-watch rule', () => {
    expect(teamSignal(emptyValues({ sayDo: 0.4 }), 'scrum').signal).toBe('needs-attention')
    expect(teamSignal(emptyValues({ sayDo: 0.7, scopeChange: 0.2 }), 'scrum').signal).toBe('watch')
    expect(teamSignal(emptyValues({ sayDo: 0.7 }), 'scrum').signal).toBe('on-track')
  })
})

describe('forecast', () => {
  it('is deterministic for the same history', () => {
    const history = Array.from({ length: 84 }, (_, i) => (i * 7) % 4)
    expect(forecastItems(history, 2000)).toBe(forecastItems([...history], 2000))
  })
  it('gives no value for an all-zero history and stays below the mean total', () => {
    expect(forecastItems(new Array(84).fill(0), 2000)).toBeNull()
    expect(forecastItems(new Array(84).fill(2), 2000)).toBe(28)
    const noisy = Array.from({ length: 84 }, (_, i) => (i % 3 === 0 ? 4 : 0))
    expect(forecastItems(noisy, 2000)!).toBeLessThan(14 * (4 / 3))
  })
})

describe('pulse privacy', () => {
  it('hides pulses under 3 respondents', () => {
    const ds = dataset({ pulseChecks: [pulse('a', 5, 2, 1), pulse('b', 5, 3, 4)] })
    const w = windowEndingAt(asOfMs, 30)
    expect(computeScorecard(ds, ['a'], w).values.pulseScore).toBeNull()
    expect(computeScorecard(ds, ['a', 'b'], w).values.pulseScore).toBe(4)
  })
  it('falls back to no mover when a pulse is hidden', () => {
    const ds = dataset({ pulseChecks: [pulse('a', 5, 2, 5), pulse('a', 40, 8, 3)] })
    const cur = windowEndingAt(asOfMs, 30)
    const m = pulseMovers(ds, new Set(['a']), cur, windowEndingAt(cur.start, 30))
    expect(m).toEqual({ rise: null, fall: null })
  })
})

describe('mock dataset', () => {
  const ds = generateMockDataset()
  const all = ds.squads.map((s) => s.id)

  it('computes every metric for a group without throwing', () => {
    const { current } = computePeriod(ds, all, 90)
    expect(current.values.velocity).toBeNull()
    expect(current.values.healthIndex).not.toBeNull()
    expect(current.categories && Object.values(current.categories).reduce((a, b) => a + b, 0)).toBeCloseTo(1)
  })
  it('shows velocity for a single scrum team only', () => {
    const scrum = ds.squads.find((s) => s.teamType === 'scrum')!.id
    expect(computePeriod(ds, [scrum], 90).current.values.velocity).not.toBeNull()
  })
  it('builds trends of the specified length', () => {
    expect(trend(ds, all, 'sayDo')).toHaveLength(12)
    expect(trend(ds, all, 'velocityCv')).toHaveLength(8)
    expect(trend(ds, all, 'pulseScore')).toHaveLength(7)
  })
})
