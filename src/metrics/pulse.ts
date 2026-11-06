import type { Dataset, PulseCheck, PulseDimension } from '../data/model'
import { MIN_PULSE_RESPONDENTS, PULSE_DIMENSIONS } from '../data/model'
import { inWindow, toMs, type Window } from './periods'
import { mean } from './stats'

/** Pulses under the respondent minimum are hidden everywhere. */
export const isReportable = (p: PulseCheck) => p.respondents >= MIN_PULSE_RESPONDENTS

/** Each team's latest reportable pulse inside the window. */
export function latestPulses(dataset: Dataset, squadIds: ReadonlySet<string>, w: Window): PulseCheck[] {
  const latest = new Map<string, PulseCheck>()
  for (const p of dataset.pulseChecks) {
    if (!squadIds.has(p.squadId) || !isReportable(p) || !inWindow(toMs(p.date), w)) continue
    const cur = latest.get(p.squadId)
    if (!cur || toMs(p.date) > toMs(cur.date)) latest.set(p.squadId, p)
  }
  return [...latest.values()]
}

export const pulseMean = (p: PulseCheck) => mean(PULSE_DIMENSIONS.map((d) => p.scores[d])) as number

export interface PulseMover {
  dimension: PulseDimension
  delta: number
}

/** Teams with a pulse in both windows; per dimension, mean score change. Either mover can be absent. */
export function pulseMovers(
  dataset: Dataset,
  squadIds: ReadonlySet<string>,
  current: Window,
  previous: Window,
): { rise: PulseMover | null; fall: PulseMover | null } {
  const cur = new Map(latestPulses(dataset, squadIds, current).map((p) => [p.squadId, p]))
  const prev = new Map(latestPulses(dataset, squadIds, previous).map((p) => [p.squadId, p]))
  const both = [...cur.keys()].filter((id) => prev.has(id))
  if (!both.length) return { rise: null, fall: null }
  const deltas: PulseMover[] = PULSE_DIMENSIONS.map((dimension) => ({
    dimension,
    delta:
      (mean(both.map((id) => cur.get(id)!.scores[dimension])) as number) -
      (mean(both.map((id) => prev.get(id)!.scores[dimension])) as number),
  }))
  const rise = deltas.reduce((a, b) => (b.delta > a.delta ? b : a))
  const fall = deltas.reduce((a, b) => (b.delta < a.delta ? b : a))
  return { rise: rise.delta > 0 ? rise : null, fall: fall.delta < 0 ? fall : null }
}
