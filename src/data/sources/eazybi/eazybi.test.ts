import { describe, expect, it } from 'vitest'
import { computePeriod } from '../../../metrics'
import { generateMockDataset } from '../mock/generate'
import { ConversionError, convertExports, formatSummary } from './convert'
import { parseCsv } from './csv'
import { parseDate } from './dates'
import { snapshotUrl } from './index'
import { makeSampleExports } from './sample'

const ASOF = '2026-10-02T18:00:00.000Z'

describe('csv and dates', () => {
  it('reads quoted fields, semicolons and a BOM', () => {
    expect(parseCsv('﻿a;b\n"x;1";"he said ""hi"""\n').rows).toEqual([['x;1', 'he said "hi"']])
  })
  it('accepts every documented date format', () => {
    expect(parseDate('2026-03-05')).toBe('2026-03-05T00:00:00.000Z')
    expect(parseDate('2026-03-05 10:30')).toBe('2026-03-05T10:30:00.000Z')
    expect(parseDate('2026-03-05 10:30:15')).toBe('2026-03-05T10:30:15.000Z')
    expect(parseDate('05/03/2026')).toBe('2026-03-05T00:00:00.000Z')
    expect(parseDate('2026-03-05T10:30:00Z')).toBe('2026-03-05T10:30:00.000Z')
    expect(parseDate('31/02/2026')).toBeNull()
    expect(parseDate('soon')).toBeNull()
  })
})

describe('eazyBI round trip', () => {
  const mock = generateMockDataset()
  // eazyBI has no pulse checks, so compare against the dummy data without them.
  const reference = { ...mock, pulseChecks: [] }
  const sample = makeSampleExports(mock)
  const { dataset, summary } = convertExports({ ...sample, asOf: ASOF })

  it('reproduces the dummy dataset metrics to 4 decimals', () => {
    const ids = dataset.squads.map((s) => s.id)
    expect(ids).toEqual(reference.squads.map((s) => s.id))
    for (const period of [30, 90, 180]) {
      for (const scope of [ids, ...ids.map((id) => [id])]) {
        const a = computePeriod(reference, scope, period).current.values
        const b = computePeriod(dataset, scope, period).current.values
        for (const key of Object.keys(a) as (keyof typeof a)[]) {
          if (a[key] === null || b[key] === null) expect(b[key]).toBe(a[key])
          else expect(b[key]).toBeCloseTo(a[key], 4)
        }
      }
    }
  })

  it('labels the snapshot as real-source data', () => {
    expect(dataset.source).toEqual({ id: 'eazybi', label: 'eazyBI snapshot', isDummy: false })
    expect(dataset.pulseChecks).toEqual([])
  })

  it('prints counts only', () => {
    expect(summary.issues.used).toBe(mock.workItems.length)
    expect(summary.sprints.used).toBe(mock.sprints.length)
    const text = formatSummary(summary, false)
    expect(text).toContain(`${mock.workItems.length} used of ${mock.workItems.length} rows`)
    for (const s of mock.squads) expect(text).not.toContain(s.name)
    for (const w of mock.workItems.slice(0, 20)) expect(text).not.toContain(w.summary)
    expect(formatSummary(summary, true)).toContain(mock.squads[0].name)
  })
})

describe('conversion rules', () => {
  const teams = [{ name: 'Alpha', teamType: 'scrum' as const, domain: 'D', issueMatch: ['AL'], sprintMatch: ['Alpha'] }]
  const sprintsCsv = 'Sprint,Sprint start date,Sprint end date,Sprint Story Points committed,Sprint Story Points added,Sprint Story Points removed,Sprint Story Points completed\nAlpha 1,01/09/2026,14/09/2026,20,4,2,15\nOther 1,01/09/2026,14/09/2026,5,0,0,5\n'
  const head = 'Issue,Issue type,Issue created date,First in progress date,Issue resolution date,Issue Story Points,Work category\n'
  const run = (issues: string) => convertExports({ issuesCsv: head + issues, sprintsCsv, teams, asOf: ASOF })

  it('drops epics and sub-tasks, maps unknown types to task, and counts the rest', () => {
    const { dataset, summary } = run(
      'AL-1 One,Story,2026-09-01,2026-09-02,2026-09-05,3,okr aligned\n' +
      'AL-2 Two,Epic,2026-09-01,,,,\n' +
      'AL-3 Three,Sub-task,2026-09-01,,,,\n' +
      'AL-4 Four,Spike,2026-09-01,,,,ktlo\n' +
      'ZZ-5 Five,Story,2026-09-01,,,,\n' +
      'AL-6 Six,Bug,2026-09-01,,,,mystery\n',
    )
    expect(dataset.workItems.map((w) => [w.key, w.type, w.category])).toEqual([
      ['AL-1', 'story', 'OKR aligned'], ['AL-4', 'task', 'Keep the lights on'], ['AL-6', 'bug', 'None'],
    ])
    expect(summary.issues).toMatchObject({ total: 6, used: 3, excludedByType: 2, unmatched: 1, notDone: 2, withoutStart: 2, withoutPoints: 2, unknownCategory: 1 })
  })

  it('estimates completed of committed and matches sprints by name prefix', () => {
    const { dataset, summary } = run('')
    expect(dataset.sprints).toHaveLength(1)
    expect(dataset.sprints[0]).toMatchObject({ committedPoints: 20, completedCommittedPoints: 15, completedAddedPoints: 0, goalMet: null })
    expect(summary.sprints).toMatchObject({ total: 2, used: 1, unmatched: 1, completedOfCommittedEstimated: 1 })
  })

  it('names file, row and column in errors without echoing values', () => {
    expect(() => run('AL-1 One,Story,not-a-date,,,,\n')).toThrow(/issues\.csv row 2, column "Issue created date".*not-a-date/)
    try {
      run('AL-1 One,Story,2026-09-01,,,secret,\n')
    } catch (e) {
      expect(e).toBeInstanceOf(ConversionError)
      expect((e as Error).message).toBe('issues.csv row 2, column "Issue Story Points": not a number.')
    }
  })
})

describe('snapshot URL', () => {
  it('defaults to data/snapshot.json under the base path', () => {
    expect(snapshotUrl(undefined, '/')).toBe('/data/snapshot.json')
    expect(snapshotUrl('', '/hub/')).toBe('/hub/data/snapshot.json')
    expect(snapshotUrl('  ', './')).toBe('./data/snapshot.json')
  })
  it('uses VITE_SNAPSHOT_URL when set', () => {
    expect(snapshotUrl('./custom/snap.json', '/')).toBe('./custom/snap.json')
  })
})
