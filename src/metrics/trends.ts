import type { Dataset } from '../data/model'
import type { MetricId } from './catalogue'
import { computeScorecard } from './compute'
import { DAY_MS, dayMonth, toMs, windowEndingAt } from './periods'

interface TrendSpec {
  points: number
  step: number
  window: number
}

const DEFAULT_SPEC: TrendSpec = { points: 12, step: 14, window: 28 }

export const TREND_SPECS: Partial<Record<MetricId, TrendSpec>> = {
  sayDo: { points: 12, step: 14, window: 14 },
  scopeChange: { points: 12, step: 14, window: 14 },
  velocity: { points: 12, step: 14, window: 14 },
  goalHitRate: { points: 12, step: 14, window: 42 },
  velocityCv: { points: 8, step: 14, window: 84 },
  throughputCv: { points: 12, step: 14, window: 56 },
  pulseScore: { points: 7, step: 28, window: 28 },
}

export interface TrendPoint {
  /** Window end, e.g. "2 Oct". */
  label: string
  value: number | null
}

/** One metric recomputed over trailing windows, oldest first. */
export function trend(dataset: Dataset, squadIds: string[], id: MetricId): TrendPoint[] {
  const spec = TREND_SPECS[id] ?? DEFAULT_SPEC
  const snapshot = toMs(dataset.asOf)
  return Array.from({ length: spec.points }, (_, i) => {
    const end = snapshot - (spec.points - 1 - i) * spec.step * DAY_MS
    return {
      label: dayMonth(end),
      value: computeScorecard(dataset, squadIds, windowEndingAt(end, spec.window)).values[id],
    }
  })
}
