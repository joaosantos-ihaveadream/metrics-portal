import type { Dataset, Squad } from '../../data/model'
import { computePeriod, teamSignal, type Scorecard, type TeamSignal } from '../../metrics'

export interface TeamRow {
  squad: Squad
  domain: string
  lead: string
  pod: string | null
  current: Scorecard
  previous: Scorecard
  signal: TeamSignal
}

/** One row per team in scope: both windows' scorecards and the team health signal. */
export function teamRows(dataset: Dataset, squadIds: string[], period: number): TeamRow[] {
  const ids = new Set(squadIds)
  return dataset.squads
    .filter((s) => ids.has(s.id))
    .map((squad) => {
      const { current, previous } = computePeriod(dataset, [squad.id], period)
      return {
        squad,
        domain: dataset.domains.find((d) => d.id === squad.domainId)?.name ?? '',
        lead: dataset.deliveryLeads.find((l) => l.id === squad.deliveryLeadId)?.name ?? '',
        pod: dataset.pods.find((p) => p.id === squad.podId)?.name ?? null,
        current,
        previous,
        signal: teamSignal(current.values, squad.teamType),
      }
    })
}
