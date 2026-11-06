import { describe, expect, it } from 'vitest'
import { generateMockDataset } from '../../data/sources/mock/generate'
import { computePeriod, toMs, windowEndingAt } from '../../metrics'
import { answerFor } from '../overview/insightAnswer'
import { buildInsights } from '../overview/insights'
import { teamRows } from '../overview/teamRows'
import { sprintHistory, workByInitiative } from './teamData'

const ds = generateMockDataset()
const w = windowEndingAt(toMs(ds.asOf), 90)

describe('team detail helpers', () => {
  it('splits finished work by initiative and adds up to the team total', () => {
    const squad = ds.squads[0]
    const shares = workByInitiative(ds, squad.id, w)
    const total = shares.reduce((a, s) => a + s.count, 0)
    expect(total).toBe(computePeriod(ds, [squad.id], 90).current.values.throughput! * (90 / 7))
  })
  it('lists sprints newest first with Say/Do', () => {
    const scrum = ds.squads.find((s) => s.teamType === 'scrum')!
    const rows = sprintHistory(ds, scrum.id, w)
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every((r, i) => i === 0 || toMs(rows[i - 1].endDate) >= toMs(r.endDate))).toBe(true)
  })
})

describe('step 7 acceptance', () => {
  const granite = teamRows(ds, ds.squads.map((s) => s.id), 90).find((r) => r.squad.name === 'Granite')!
  it('Granite needs attention with Say/Do near 59%', () => {
    expect(granite.signal.signal).toBe('needs-attention')
    expect(granite.current.values.sayDo!).toBeGreaterThan(0.59 * 0.85)
    expect(granite.current.values.sayDo!).toBeLessThan(0.59 * 1.15)
  })
})

describe('insight answers', () => {
  const insights = buildInsights(teamRows(ds, ds.squads.map((s) => s.id), 90))
  it('gives coaching prompts as bullets for team questions', () => {
    const a = answerFor('Which questions should I take to the teams?', insights, 'Global Platforms', 90)
    expect(a.startsWith('•')).toBe(true)
  })
  it('summarises other questions with the top 3 insights', () => {
    const a = answerFor('What needs attention, and why?', insights, 'Global Platforms', 90)
    expect(a).toMatch(/^For Global Platforms over the last 90 days, \d+ signals? need/)
    expect(a.split('\n').length).toBe(4)
  })
})
