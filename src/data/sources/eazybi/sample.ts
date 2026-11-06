import type { Dataset } from '../../model'
import type { TeamEntry } from './convert'
import { toCsv } from './csv'

export interface SampleExports {
  issuesCsv: string
  sprintsCsv: string
  teams: TeamEntry[]
}

const lookup = <T extends { id: string; name: string }>(list: T[], id: string | null) => list.find((x) => x.id === id)?.name

/** Fictional eazyBI exports written from a (dummy) dataset, in the default column layout. */
export function makeSampleExports(d: Dataset): SampleExports {
  const initiative = new Map(d.initiatives.map((i) => [i.id, i.name]))
  const issuesCsv = toCsv(
    ['Issue', 'Issue type', 'Issue created date', 'First in progress date', 'Issue resolution date', 'Issue Story Points', 'Issue Epic Link', 'Work category'],
    d.workItems.map((w) => [
      `${w.key} ${w.summary}`, w.type[0].toUpperCase() + w.type.slice(1), w.createdAt, w.startedAt, w.doneAt,
      w.storyPoints, w.initiativeId ? (initiative.get(w.initiativeId) ?? null) : null, w.category === 'None' ? null : w.category,
    ]),
  )
  const squadName = new Map(d.squads.map((s) => [s.id, s.name]))
  const sprintsCsv = toCsv(
    ['Sprint', 'Board', 'Sprint start date', 'Sprint end date', 'Sprint Story Points committed', 'Sprint Story Points added',
      'Sprint Story Points removed', 'Sprint Story Points completed', 'Sprint Story Points completed of committed', 'Sprint goal met'],
    d.sprints.map((s) => [
      s.name, squadName.get(s.squadId) ?? '', s.startDate, s.endDate, s.committedPoints, s.addedPoints, s.removedPoints,
      s.completedCommittedPoints + s.completedAddedPoints, s.completedCommittedPoints,
      s.goalMet === null ? null : s.goalMet ? 'Yes' : 'No',
    ]),
  )
  const teams: TeamEntry[] = d.squads.map((s) => ({
    name: s.name,
    teamType: s.teamType,
    domain: lookup(d.domains, s.domainId)!,
    valueStream: lookup(d.valueStreams, s.valueStreamId),
    deliveryLead: lookup(d.deliveryLeads, s.deliveryLeadId),
    pod: lookup(d.pods, s.podId),
    issueMatch: [s.boardKey],
    sprintMatch: [s.name],
  }))
  return { issuesCsv, sprintsCsv, teams }
}
