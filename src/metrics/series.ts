import type { Dataset, WorkItem } from '../data/model'
import { cycleDays, doneIn, wipAt } from './compute'
import { DAY_MS, inWindow, toMs, weekBuckets as rawWeekBuckets, type Window } from './periods'
import { percentile } from './stats'

/** Week buckets clipped to the window, so weekly figures add up to the period's total. */
const weekBuckets = (w: Window): Window[] => rawWeekBuckets(w).map((b) => ({ start: Math.max(b.start, w.start), end: b.end }))

const itemsFor = (dataset: Dataset, squadIds: string[]) => {
  const ids = new Set(squadIds)
  return dataset.workItems.filter((i) => ids.has(i.squadId))
}

export interface FinishedItem {
  key: string
  summary: string
  doneAt: number
  cycleDays: number
}

/** Items finished in the window that were started, one per scatter dot. */
export function finishedItems(dataset: Dataset, squadIds: string[], w: Window): FinishedItem[] {
  return doneIn(itemsFor(dataset, squadIds), w)
    .filter((i) => i.startedAt)
    .map((i) => ({
      key: i.key,
      summary: i.summary,
      doneAt: toMs(i.doneAt!),
      cycleDays: (toMs(i.doneAt!) - toMs(i.startedAt!)) / DAY_MS,
    }))
}

export interface WeekCount {
  /** Week end, e.g. "2 Oct". */
  end: number
  value: number
}

/** Items done per 7-day bucket, oldest first. */
export function weeklyDone(items: WorkItem[], w: Window): WeekCount[] {
  return weekBuckets(w).map((b) => ({ end: b.end, value: doneIn(items, b).length }))
}

export const weeklyThroughput = (dataset: Dataset, squadIds: string[], w: Window) =>
  weeklyDone(itemsFor(dataset, squadIds), w)

export interface HistogramBin {
  label: string
  count: number
  share: number
}

export const HISTOGRAM_WIDTH = 2
export const HISTOGRAM_BINS = 12

/** Cycle days in equal bins; the last bin collects everything longer. */
export function histogram(values: number[], width = HISTOGRAM_WIDTH, bins = HISTOGRAM_BINS): HistogramBin[] {
  const counts = new Array<number>(bins).fill(0)
  for (const v of values) counts[Math.min(bins - 1, Math.floor(v / width))]++
  return counts.map((count, i) => ({
    label: i === bins - 1 ? `${i * width}+` : `${i * width}–${(i + 1) * width}`,
    count,
    share: values.length ? count / values.length : 0,
  }))
}

export interface AgeingItem {
  item: WorkItem
  age: number
  /** The team's own 85th percentile cycle time over the window; null without finished items. */
  teamP85: number | null
  /** Age as a multiple of the team's p85. */
  multiple: number | null
}

/** Open work at the window end, oldest first. */
export function ageingItems(dataset: Dataset, squadIds: string[], w: Window): AgeingItem[] {
  const all = itemsFor(dataset, squadIds)
  const p85 = new Map<string, number | null>()
  for (const id of squadIds) {
    p85.set(id, percentile(cycleDays(doneIn(all.filter((i) => i.squadId === id), w)), 85))
  }
  return wipAt(all, w.end)
    .map((item) => {
      const age = (w.end - toMs(item.startedAt!)) / DAY_MS
      const teamP85 = p85.get(item.squadId) ?? null
      return { item, age, teamP85, multiple: teamP85 ? age / teamP85 : null }
    })
    .sort((a, b) => b.age - a.age)
}

export interface BugCounts {
  raised: number
  resolved: number
  /** Raised minus resolved. */
  net: number
}

const isBug = (i: WorkItem) => i.type === 'bug'

export function bugCounts(items: WorkItem[], w: Window): BugCounts {
  const bugs = items.filter(isBug)
  const raised = bugs.filter((i) => inWindow(toMs(i.createdAt), w)).length
  const resolved = doneIn(bugs, w).length
  return { raised, resolved, net: raised - resolved }
}

export const bugCountsFor = (dataset: Dataset, squadIds: string[], w: Window) =>
  bugCounts(itemsFor(dataset, squadIds), w)

export interface BugWeek extends BugCounts {
  end: number
}

export function weeklyBugs(dataset: Dataset, squadIds: string[], w: Window): BugWeek[] {
  const items = itemsFor(dataset, squadIds)
  return weekBuckets(w).map((b) => ({ end: b.end, ...bugCounts(items, b) }))
}

export interface SprintPoint {
  name: string
  committed: number
  completedCommitted: number
  added: number
  sayDo: number | null
  velocity: number
  goalMet: boolean | null
}

/** A team's sprints ending in the window, oldest first. */
export function sprintPoints(dataset: Dataset, squadId: string, w: Window): SprintPoint[] {
  return dataset.sprints
    .filter((s) => s.squadId === squadId && inWindow(toMs(s.endDate), w))
    .sort((a, b) => toMs(a.endDate) - toMs(b.endDate))
    .map((s) => ({
      name: s.name,
      committed: s.committedPoints,
      completedCommitted: s.completedCommittedPoints,
      added: s.addedPoints,
      sayDo: s.committedPoints > 0 ? s.completedCommittedPoints / s.committedPoints : null,
      velocity: s.completedCommittedPoints + s.completedAddedPoints,
      goalMet: s.goalMet,
    }))
}

/** Say/Do of a team's last `n` sprints up to the window end, oldest first. */
export function recentSayDo(dataset: Dataset, squadId: string, end: number, n = 8): (number | null)[] {
  return dataset.sprints
    .filter((s) => s.squadId === squadId && toMs(s.endDate) <= end)
    .sort((a, b) => toMs(a.endDate) - toMs(b.endDate))
    .slice(-n)
    .map((s) => (s.committedPoints > 0 ? s.completedCommittedPoints / s.committedPoints : null))
}
