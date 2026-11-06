import type { Dataset } from '../../data/model'
import { doneIn, toMs, type Window } from '../../metrics'

export interface InitiativeShare {
  name: string
  count: number
}

/** Items a team finished in the window, grouped by initiative, largest first. Work without an initiative is last. */
export function workByInitiative(dataset: Dataset, squadId: string, w: Window): InitiativeShare[] {
  const counts = new Map<string | null, number>()
  for (const i of doneIn(dataset.workItems.filter((x) => x.squadId === squadId), w)) {
    counts.set(i.initiativeId, (counts.get(i.initiativeId) ?? 0) + 1)
  }
  const named = [...counts]
    .filter(([id]) => id !== null)
    .map(([id, count]) => ({ name: dataset.initiatives.find((x) => x.id === id)?.name ?? id!, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  const none = counts.get(null)
  return none ? [...named, { name: 'No initiative', count: none }] : named
}

export interface SprintRow {
  id: string
  name: string
  endDate: string
  committed: number
  added: number
  velocity: number
  sayDo: number | null
  goal: string
  goalMet: boolean | null
}

/** A team's sprints ending in the window, newest first. */
export function sprintHistory(dataset: Dataset, squadId: string, w: Window): SprintRow[] {
  return dataset.sprints
    .filter((s) => s.squadId === squadId && toMs(s.endDate) > w.start && toMs(s.endDate) <= w.end)
    .sort((a, b) => toMs(b.endDate) - toMs(a.endDate))
    .map((s) => ({
      id: s.id, name: s.name, endDate: s.endDate, committed: s.committedPoints, added: s.addedPoints,
      velocity: s.completedCommittedPoints + s.completedAddedPoints,
      sayDo: s.committedPoints > 0 ? s.completedCommittedPoints / s.committedPoints : null,
      goal: s.goal, goalMet: s.goalMet,
    }))
}
