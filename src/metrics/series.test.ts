import { describe, expect, it } from 'vitest'
import { generateMockDataset } from '../data/sources/mock/generate'
import { accuracySteps, computePeriod } from './compute'
import { forecastItems } from './forecast'
import { DAY_MS } from './periods'
import { toMs } from './periods'
import { median } from './stats'
import { bugCountsFor, histogram, trendWindowText, ageingItems, finishedItems, weeklyThroughput, weeklyBugs, sprintPoints } from './index'

const dataset = generateMockDataset()
const all = dataset.squads.map((s) => s.id)
const { window, current } = computePeriod(dataset, all, 90)

describe('histogram', () => {
  it('bins values, collects the long tail in the last bin and shares add to 1', () => {
    const bins = histogram([1, 1, 3, 100], 2, 3)
    expect(bins.map((b) => b.count)).toEqual([2, 1, 1])
    expect(bins[2].label).toBe('4+')
    expect(bins.reduce((a, b) => a + b.share, 0)).toBeCloseTo(1)
  })
  it('has zero shares without data', () => expect(histogram([]).every((b) => b.share === 0)).toBe(true))
})

describe('trendWindowText', () => {
  it('describes the trailing window and step', () => {
    expect(trendWindowText('cycleP85')).toBe('trailing 4-week windows, every 2 weeks')
    expect(trendWindowText('sayDo')).toBe('trailing 2-week windows, every 2 weeks')
  })
})

describe('flow and quality series', () => {
  it('finished items and weekly throughput agree with the scorecard', () => {
    const done = weeklyThroughput(dataset, all, window).reduce((a, w) => a + w.value, 0)
    expect(done / (90 / 7)).toBeCloseTo(current.values.throughput!, 5)
    expect(finishedItems(dataset, all, window).length).toBeLessThanOrEqual(done)
  })
  it('ageing items are oldest first and match the WIP count', () => {
    const wip = ageingItems(dataset, all, window)
    expect(wip.length).toBe(current.values.wip)
    expect(wip.map((w) => w.age)).toEqual([...wip.map((w) => w.age)].sort((a, b) => b - a))
  })
  it('bug counts net out and weekly buckets add up to the period', () => {
    const c = bugCountsFor(dataset, all, window)
    expect(c.net).toBe(c.raised - c.resolved)
    const weeks = weeklyBugs(dataset, all, window)
    expect(weeks.reduce((a, w) => a + w.raised, 0)).toBe(c.raised)
    expect(weeks.reduce((a, w) => a + w.resolved, 0)).toBe(c.resolved)
  })
  it('sprint points for a Scrum team carry Say/Do and velocity', () => {
    const scrum = dataset.squads.find((s) => s.teamType === 'scrum')!
    const pts = sprintPoints(dataset, scrum.id, window)
    expect(pts.length).toBeGreaterThan(0)
    for (const p of pts) expect(p.sayDo).toBeCloseTo(p.completedCommitted / p.committed, 9)
  })
})

describe('reference values at 90 days (Scrum teams)', () => {
  const reference: Record<string, [number, number]> = {
    Atlas: [11.5, 92], Borealis: [10.0, 69], Dune: [7.6, 77], Ember: [12.7, 85],
    Granite: [23.2, 92], Halo: [9.2, 100], Juno: [34.5, 100], Kestrel: [9.1, 92],
  }
  it('the group velocity variability is the median of the teams, not the mean or the pooled value', () => {
    const med = median(Object.values(reference).map(([cv]) => cv))!
    expect(med).toBeCloseTo(10.75, 2)
    const scrum = dataset.squads.filter((s) => s.teamType === 'scrum')
    const own = scrum.map((s) => computePeriod(dataset, [s.id], 90).current.values.velocityCv!)
    expect(computePeriod(dataset, scrum.map((s) => s.id), 90).current.values.velocityCv).toBeCloseTo(median(own)!, 9)
  })
  it('forecasting accuracy is a share of 13 weekly backtests at 90 days', () => {
    expect(accuracySteps(90)).toBe(13)
    expect(accuracySteps(30)).toBe(5)
    expect(accuracySteps(180)).toBe(26)
    for (const [cv, acc] of Object.values(reference)) {
      expect(cv).toBeGreaterThan(0)
      expect(Math.abs(acc - Math.round((acc / 100) * 13) * (100 / 13))).toBeLessThan(0.5)
    }
    for (const s of dataset.squads.filter((x) => x.teamType === 'scrum')) {
      const a = computePeriod(dataset, [s.id], 90).current.values.forecastAccuracy!
      expect(Math.abs(a * 13 - Math.round(a * 13))).toBeLessThan(1e-9)
    }
  })
})

describe('generator sprints match the reference in the 90-day window', () => {
  const sprints = (id: string) =>
    dataset.sprints
      .filter((s) => s.squadId === id && toMs(s.endDate) > window.start && toMs(s.endDate) <= window.end)
      .map((s) => [s.endDate.slice(5, 10), s.committedPoints, s.completedCommittedPoints, s.completedAddedPoints])
  it('Juno', () => {
    expect(sprints('juno')).toEqual([
      ['07-08', 34, 24, 5], ['07-22', 33, 22, 3], ['08-05', 15, 11, 1], ['08-19', 50, 34, 2],
      ['09-02', 42, 32, 3], ['09-16', 44, 38, 3], ['09-30', 26, 20, 2],
    ])
  })
  it('Dune', () => {
    expect(sprints('dune')).toEqual([
      ['07-08', 35, 30, 2], ['07-22', 42, 36, 5], ['08-05', 36, 34, 1], ['08-19', 36, 34, 2],
      ['09-02', 40, 34, 3], ['09-16', 38, 34, 2], ['09-30', 38, 32, 6],
    ])
  })
})

describe('forecasting accuracy per team at 90 days (hits out of 13 backtests)', () => {
  const hits: Record<string, number> = { atlas: 12, borealis: 9, dune: 10, ember: 11, granite: 12, halo: 13, juno: 13, kestrel: 12 }
  it('matches the reference', () => {
    for (const [id, n] of Object.entries(hits)) {
      expect(computePeriod(dataset, [id], 90).current.values.forecastAccuracy! * 13).toBeCloseTo(n, 9)
    }
  })
})

describe('backtests at 90 days, oldest first (forecast/actual)', () => {
  const ref: Record<string, string> = {
    borealis: '12/17 12/12 12/10 12/11 12/10 11/10 11/12 10/19 10/20 10/13 10/14 10/15 10/11',
    dune: '11/8 10/9 11/10 10/17 10/14 10/10 9/15 9/13 9/11 9/11 8/12 9/12 8/12',
    group: '88/101 89/89 88/83 85/94 85/99 85/95 83/108 86/112 87/110 87/99 89/99 87/104 89/94',
  }
  const scrum = dataset.squads.filter((s) => s.teamType === 'scrum').map((s) => s.id)
  const backtests = (ids: string[]) => {
    const set = new Set(ids)
    const items = dataset.workItems.filter((i) => set.has(i.squadId) && i.doneAt)
    const end = toMs(dataset.asOf)
    const out: string[] = []
    for (let k = 12; k >= 0; k--) {
      const madeAt = end - (k * 7 + 14) * DAY_MS
      const start = madeAt - 84 * DAY_MS
      const history = new Array<number>(84).fill(0)
      for (const i of items) {
        const t = toMs(i.doneAt!)
        if (t > start && t <= madeAt) history[Math.floor((t - start) / DAY_MS)]++
      }
      const actual = items.filter((i) => toMs(i.doneAt!) > madeAt && toMs(i.doneAt!) <= madeAt + 14 * DAY_MS).length
      out.push(`${forecastItems(history, 500)}/${actual}`)
    }
    return out.join(' ')
  }
  it('Borealis', () => expect(backtests(['borealis'])).toBe(ref.borealis))
  it('Dune', () => expect(backtests(['dune'])).toBe(ref.dune))
  it('Scrum group', () => expect(backtests(scrum)).toBe(ref.group))
})
