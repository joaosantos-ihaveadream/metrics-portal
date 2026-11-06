import type { Dataset, Sprint, WorkItem, WorkCategory } from '../data/model'
import { WORK_CATEGORIES } from '../data/model'
import { scoreFor, signalFor, type MetricId, type Signal } from './catalogue'
import { forecastItems, HISTORY_DAYS, HORIZON_DAYS } from './forecast'
import { DAY_MS, inWindow, previousWindow, toMs, weekBuckets, windowEndingAt, type Window } from './periods'
import { latestPulses, pulseMean } from './pulse'
import { cv, mean, median, percentile, sum } from './stats'

export type Values = Record<MetricId, number | null>

export interface Scorecard {
  values: Values
  /** Share of items done per category (adds up to 1), empty when nothing was done. */
  categories: Record<WorkCategory, number> | null
  /** Per-team health index (teams with no value omitted). */
  teamHealth: Record<string, number>
}

const days = (ms: number) => ms / DAY_MS

export const doneIn = (items: WorkItem[], w: Window) =>
  items.filter((i) => i.doneAt && inWindow(toMs(i.doneAt), w))

export const cycleDays = (items: WorkItem[]) =>
  items.filter((i) => i.startedAt).map((i) => days(toMs(i.doneAt!) - toMs(i.startedAt!)))

const leadDays = (items: WorkItem[]) => items.map((i) => days(toMs(i.doneAt!) - toMs(i.createdAt)))

const sprintsIn = (sprints: Sprint[], w: Window) => sprints.filter((s) => inWindow(toMs(s.endDate), w))

/** Open work at a moment: started and not done. */
export const wipAt = (items: WorkItem[], at: number) =>
  items.filter((i) => i.startedAt && toMs(i.startedAt) <= at && (!i.doneAt || toMs(i.doneAt) > at))

function sprintVelocity(s: Sprint) {
  return s.completedCommittedPoints + s.completedAddedPoints
}

function weeklyCounts(items: WorkItem[], w: Window): number[] {
  return weekBuckets(w).map((b) => doneIn(items, b).length)
}

/** Done counts per day for the `span` days up to `end`: bucket = floor((doneAt − historyStart) / 1 day), historyStart < doneAt ≤ end. */
function dailyCounts(items: WorkItem[], end: number, span: number): number[] {
  const start = end - span * DAY_MS
  const counts = new Array<number>(span).fill(0)
  for (const i of items) {
    if (!i.doneAt) continue
    const done = toMs(i.doneAt)
    if (done > start && done <= end) counts[Math.min(span - 1, Math.floor((done - start) / DAY_MS))]++
  }
  return counts
}

/** Step back weekly while the step's end is still inside the window: 5 for 30 days, 13 for 90, 26 for 180. */
export const accuracySteps = (winDays: number) => Math.max(1, Math.ceil(winDays / 7))

function accuracy(items: WorkItem[], w: Window): number | null {
  const steps = accuracySteps(Math.round(days(w.end - w.start)))
  let hit = 0
  let made = 0
  for (let k = 0; k < steps; k++) {
    const origin = w.end - (HORIZON_DAYS + 7 * k) * DAY_MS
    const forecast = forecastItems(dailyCounts(items, origin, HISTORY_DAYS), 500)
    if (forecast === null) continue
    const actual = doneIn(items, { start: origin, end: origin + HORIZON_DAYS * DAY_MS }).length
    made++
    if (actual >= forecast) hit++
  }
  return made ? hit / made : null
}

function ageingShare(items: WorkItem[], end: number): number | null {
  const open = wipAt(items, end)
  if (!open.length) return null
  const base = cycleDays(doneIn(items, windowEndingAt(end, 90)))
  const threshold = percentile(base, 85)
  if (threshold === null) return null
  return open.filter((i) => days(end - toMs(i.startedAt!)) > threshold).length / open.length
}

const ratio = (num: number, den: number) => (den > 0 ? num / den : null)

/** Metrics from raw data for a set of teams (no health index; that needs per-team values). */
function baseValues(dataset: Dataset, squadIds: string[], w: Window): Omit<Scorecard, 'teamHealth'> {
  const ids = new Set(squadIds)
  const squads = dataset.squads.filter((s) => ids.has(s.id))
  const scrumIds = new Set(squads.filter((s) => s.teamType === 'scrum').map((s) => s.id))
  const kanbanIds = squads.filter((s) => s.teamType === 'kanban').map((s) => s.id)
  const items = dataset.workItems.filter((i) => ids.has(i.squadId))
  const done = doneIn(items, w)
  const winDays = days(w.end - w.start)
  const sprints = sprintsIn(dataset.sprints.filter((s) => scrumIds.has(s.squadId)), w)

  const committed = sum(sprints.map((s) => s.committedPoints))
  const velocities = sprints.map(sprintVelocity)

  const velocityCvs = [...scrumIds]
    .map((id) => {
      const v = sprints.filter((s) => s.squadId === id).map(sprintVelocity)
      return v.length >= 3 ? cv(v) : null
    })
    .filter((x): x is number => x !== null)

  const throughputCvs = kanbanIds
    .map((id) => {
      const counts = weeklyCounts(items.filter((i) => i.squadId === id), w)
      return counts.length >= 2 ? cv(counts) : null
    })
    .filter((x): x is number => x !== null)

  const outcomes = sprints.filter((s) => s.goalMet !== null)
  const pulses = latestPulses(dataset, ids, w)

  const categories = done.length
    ? (Object.fromEntries(
        WORK_CATEGORIES.map((c) => [c, done.filter((i) => i.category === c).length / done.length]),
      ) as Record<WorkCategory, number>)
    : null

  const forecastHistory = dailyCounts(items, w.end, HISTORY_DAYS)

  const values: Values = {
    sayDo: ratio(sum(sprints.map((s) => s.completedCommittedPoints)), committed),
    scopeChange: ratio(sum(sprints.map((s) => s.addedPoints)), committed),
    velocity: squads.length === 1 && scrumIds.size === 1 ? mean(velocities) : null,
    velocityCv: median(velocityCvs),
    goalHitRate: ratio(outcomes.filter((s) => s.goalMet).length, outcomes.length),
    throughput: items.length ? done.length / (winDays / 7) : null,
    throughputCv: median(throughputCvs),
    cycleP50: percentile(cycleDays(done), 50),
    cycleP85: percentile(cycleDays(done), 85),
    leadP85: percentile(leadDays(done), 85),
    wip: items.length ? wipAt(items, w.end).length : null,
    ageingWipShare: ageingShare(items, w.end),
    bugRatio: ratio(done.filter((i) => i.type === 'bug').length, done.length),
    healthIndex: null,
    pulseScore: mean(pulses.map(pulseMean)),
    okrShare: categories ? categories['OKR aligned'] : null,
    deliveryForecast: forecastItems(forecastHistory, 2000),
    forecastAccuracy: accuracy(items, w),
  }
  return { values, categories }
}

export const HEALTH_INPUTS = {
  scrum: ['sayDo', 'cycleP85', 'velocityCv', 'scopeChange', 'leadP85', 'pulseScore'],
  kanban: ['cycleP85', 'throughputCv', 'leadP85', 'pulseScore'],
} as const satisfies Record<string, readonly MetricId[]>

export const MIN_HEALTH_INPUTS = 3

/** Mean score of a team's scorable inputs; needs at least 3. */
export function healthIndex(values: Values, teamType: 'scrum' | 'kanban'): number | null {
  const scores = HEALTH_INPUTS[teamType]
    .map((id) => scoreFor(id, values[id]))
    .filter((s): s is number => s !== null)
  return scores.length >= MIN_HEALTH_INPUTS ? mean(scores) : null
}

export const SIGNAL_METRICS = {
  scrum: ['sayDo', 'scopeChange', 'velocityCv', 'cycleP85', 'ageingWipShare', 'bugRatio'],
  kanban: ['throughputCv', 'cycleP85', 'ageingWipShare', 'bugRatio'],
} as const satisfies Record<string, readonly MetricId[]>

export interface TeamSignal {
  signal: Signal
  /** Metrics behind the signal. */
  reasons: { id: MetricId; signal: Signal }[]
}

/** Any Needs attention → Needs attention; two or more Watch → Watch; else On track. */
export function teamSignal(values: Values, teamType: 'scrum' | 'kanban'): TeamSignal {
  const flagged = SIGNAL_METRICS[teamType]
    .map((id) => ({ id: id as MetricId, signal: signalFor(id, values[id]) }))
    .filter((r): r is { id: MetricId; signal: Signal } => r.signal === 'watch' || r.signal === 'needs-attention')
  const attention = flagged.filter((r) => r.signal === 'needs-attention')
  if (attention.length) return { signal: 'needs-attention', reasons: attention }
  const watch = flagged.filter((r) => r.signal === 'watch')
  if (watch.length >= 2) return { signal: 'watch', reasons: watch }
  return { signal: 'on-track', reasons: [] }
}

const memo = new WeakMap<Dataset, Map<string, Scorecard>>()

/** Scorecard for a set of teams over a window. Memoised per dataset (datasets are never mutated). */
export function computeScorecard(dataset: Dataset, squadIds: string[], w: Window): Scorecard {
  let cache = memo.get(dataset)
  if (!cache) memo.set(dataset, (cache = new Map()))
  const key = `${[...squadIds].sort().join(',')}|${w.start}|${w.end}`
  const hit = cache.get(key)
  if (hit) return hit

  const base = baseValues(dataset, squadIds, w)
  const teamHealth: Record<string, number> = {}
  for (const id of squadIds) {
    const squad = dataset.squads.find((s) => s.id === id)
    if (!squad) continue
    const own = squadIds.length === 1 ? base.values : baseValues(dataset, [id], w).values
    const h = healthIndex(own, squad.teamType)
    if (h !== null) teamHealth[id] = h
  }
  const result: Scorecard = {
    ...base,
    values: { ...base.values, healthIndex: mean(Object.values(teamHealth)) },
    teamHealth,
  }
  cache.set(key, result)
  return result
}

/** Current and previous scorecards for the period ending at the snapshot. */
export function computePeriod(dataset: Dataset, squadIds: string[], period: number) {
  const window = windowEndingAt(toMs(dataset.asOf), period)
  const prev = previousWindow(window)
  return {
    window,
    previousWindow: prev,
    current: computeScorecard(dataset, squadIds, window),
    previous: computeScorecard(dataset, squadIds, prev),
  }
}

