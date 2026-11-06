import type { TeamType } from '../data/model'

export type Direction = 'higher' | 'lower' | 'neutral'
export type Signal = 'on-track' | 'watch' | 'needs-attention'

export interface Thresholds {
  good: number
  watch: number
}

export interface MetricDefinition {
  id: MetricId
  name: string
  category: string
  unit: string
  direction: Direction
  teamTypes: TeamType[]
  description: string
  formula: string
  source: string
  thresholds?: Thresholds
  caveat?: string
}

export const METRIC_IDS = [
  'sayDo', 'scopeChange', 'velocity', 'velocityCv', 'goalHitRate', 'throughput',
  'throughputCv', 'cycleP50', 'cycleP85', 'leadP85', 'wip', 'ageingWipShare',
  'bugRatio', 'healthIndex', 'pulseScore', 'okrShare', 'deliveryForecast', 'forecastAccuracy',
] as const
export type MetricId = (typeof METRIC_IDS)[number]

const SCRUM: TeamType[] = ['scrum']
const KANBAN: TeamType[] = ['kanban']
const BOTH: TeamType[] = ['scrum', 'kanban']

/** Ratios are stored as fractions (0.8 = 80%). Thresholds use the same unit as the value. */
export const CATALOGUE: Record<MetricId, MetricDefinition> = {
  sayDo: {
    id: 'sayDo', name: 'Commitment reliability (Say/Do)', category: 'Predictability', unit: '%', direction: 'higher',
    teamTypes: SCRUM, thresholds: { good: 0.8, watch: 0.65 },
    description: 'How much of what a team committed to at sprint start it completed.',
    formula: 'Σ completed committed points ÷ Σ committed points, sprints ending in the window',
    source: 'Sprints',
  },
  scopeChange: {
    id: 'scopeChange', name: 'Mid-sprint scope change', category: 'Predictability', unit: '%', direction: 'lower',
    teamTypes: SCRUM, thresholds: { good: 0.15, watch: 0.3 },
    description: 'Points added after a sprint started, relative to the commitment.',
    formula: 'Σ added points ÷ Σ committed points', source: 'Sprints',
  },
  velocity: {
    id: 'velocity', name: 'Velocity', category: 'Predictability', unit: 'pts', direction: 'neutral',
    teamTypes: SCRUM,
    description: 'Average points completed per sprint.',
    formula: 'mean of (completed committed + completed added) per sprint',
    source: 'Sprints',
    caveat: 'Single team only. Never compare velocity across teams.',
  },
  velocityCv: {
    id: 'velocityCv', name: 'Velocity variability', category: 'Predictability', unit: '%', direction: 'lower',
    teamTypes: SCRUM, thresholds: { good: 0.2, watch: 0.3 },
    description: 'How steady a team’s sprint velocity is.',
    formula: 'stdev ÷ mean of sprint velocity per team (needs ≥ 3 sprints); groups = median team',
    source: 'Sprints',
  },
  goalHitRate: {
    id: 'goalHitRate', name: 'Sprint goal hit rate', category: 'Predictability', unit: '%', direction: 'higher',
    teamTypes: SCRUM, thresholds: { good: 0.7, watch: 0.5 },
    description: 'Share of sprints where the sprint goal was met.',
    formula: 'sprints with goal met ÷ sprints with a recorded outcome', source: 'Sprints',
  },
  throughput: {
    id: 'throughput', name: 'Throughput', category: 'Flow', unit: '/wk', direction: 'neutral',
    teamTypes: BOTH,
    description: 'Items finished per week.',
    formula: 'items done ÷ weeks in window', source: 'Work items',
    caveat: 'Teams size and split work differently, so compare across teams with care.',
  },
  throughputCv: {
    id: 'throughputCv', name: 'Throughput variability', category: 'Predictability', unit: '%', direction: 'lower',
    teamTypes: KANBAN, thresholds: { good: 0.35, watch: 0.5 },
    description: 'How steady weekly throughput is.',
    formula: 'stdev ÷ mean of weekly done counts (weeks = window ÷ 7, at least 2); groups = median team',
    source: 'Work items',
  },
  cycleP50: {
    id: 'cycleP50', name: 'Cycle time (50th pct)', category: 'Flow', unit: 'days', direction: 'lower',
    teamTypes: BOTH,
    description: 'Typical time from start of work to done.',
    formula: '50th percentile of (doneAt − startedAt), items done in window', source: 'Work items',
  },
  cycleP85: {
    id: 'cycleP85', name: 'Cycle time (85th pct)', category: 'Flow', unit: 'days', direction: 'lower',
    teamTypes: BOTH, thresholds: { good: 10, watch: 15 },
    description: 'Time within which 85% of items are finished once started.',
    formula: '85th percentile of (doneAt − startedAt), items done in window', source: 'Work items',
  },
  leadP85: {
    id: 'leadP85', name: 'Lead time (85th pct)', category: 'Flow', unit: 'days', direction: 'lower',
    teamTypes: BOTH, thresholds: { good: 20, watch: 28 },
    description: 'Time from request to done for 85% of items.',
    formula: '85th percentile of (doneAt − createdAt), items done in window', source: 'Work items',
  },
  wip: {
    id: 'wip', name: 'Work in progress', category: 'Flow', unit: 'count', direction: 'neutral',
    teamTypes: BOTH,
    description: 'Items started and not yet done.',
    formula: 'items started and not done at the snapshot', source: 'Work items',
  },
  ageingWipShare: {
    id: 'ageingWipShare', name: 'Ageing WIP', category: 'Flow', unit: '%', direction: 'lower',
    teamTypes: BOTH, thresholds: { good: 0.2, watch: 0.4 },
    description: 'Share of work in progress that has been open longer than usual.',
    formula: 'WIP older than the p85 cycle time of the 90 days before ÷ WIP, at window end',
    source: 'Work items',
  },
  bugRatio: {
    id: 'bugRatio', name: 'Bug ratio', category: 'Quality', unit: '%', direction: 'lower',
    teamTypes: BOTH, thresholds: { good: 0.2, watch: 0.3 },
    description: 'Share of finished work that was bug fixing.',
    formula: 'bugs done ÷ all items done', source: 'Work items',
  },
  healthIndex: {
    id: 'healthIndex', name: 'Health index', category: 'Health', unit: '0–100', direction: 'higher',
    teamTypes: BOTH, thresholds: { good: 80, watch: 50 },
    description: 'Overall picture of delivery and team health, built from scored inputs.',
    formula: 'mean score of a team’s inputs (at least 3); groups = mean of teams',
    source: 'Derived',
  },
  pulseScore: {
    id: 'pulseScore', name: 'Pulse check', category: 'Health', unit: '/5', direction: 'higher',
    teamTypes: BOTH, thresholds: { good: 3.8, watch: 3.3 },
    description: 'How teams say they feel about their work.',
    formula: 'mean of dimension scores from each team’s latest reportable pulse; groups = mean of teams',
    source: 'Pulse checks',
  },
  okrShare: {
    id: 'okrShare', name: 'Development categories', category: 'Investment', unit: '%', direction: 'neutral',
    teamTypes: BOTH,
    description: 'Where finished work went. The headline is the OKR-aligned share.',
    formula: 'items done per category ÷ items done', source: 'Work items',
  },
  deliveryForecast: {
    id: 'deliveryForecast', name: 'Delivery forecast', category: 'Forecast', unit: 'items', direction: 'neutral',
    teamTypes: BOTH,
    description: 'Items likely to be finished in the next 14 days.',
    formula: 'Monte Carlo: 2,000 runs of 14 days drawn from the last 84 days; 15th percentile, rounded down',
    source: 'Work items',
  },
  forecastAccuracy: {
    id: 'forecastAccuracy', name: 'Forecasting accuracy', category: 'Forecast', unit: '%', direction: 'higher',
    teamTypes: BOTH, thresholds: { good: 0.8, watch: 0.65 },
    description: 'How often past forecasts came true.',
    formula: 'share of past weekly forecasts where actual ≥ forecast',
    source: 'Work items',
    caveat: 'A well-calibrated forecast is met about 85% of the time.',
  },
}

/** Signal for a value; none without thresholds, direction or value. */
export function signalFor(id: MetricId, value: number | null): Signal | null {
  const def = CATALOGUE[id]
  if (value === null || !def.thresholds || def.direction === 'neutral') return null
  const { good, watch } = def.thresholds
  if (def.direction === 'higher') return value >= good ? 'on-track' : value >= watch ? 'watch' : 'needs-attention'
  return value <= good ? 'on-track' : value <= watch ? 'watch' : 'needs-attention'
}

/** 0–100 score anchored on thresholds: 100 at good, 50 at watch, 0 one band further out. */
export function scoreFor(id: MetricId, value: number | null): number | null {
  const t = CATALOGUE[id].thresholds
  if (value === null || !t) return null
  const zero = t.watch + (t.watch - t.good)
  const raw = (value - zero) / (t.good - zero)
  return 100 * Math.min(1, Math.max(0, raw))
}

/** Display precision as a number of decimals (percent in points, so ratios use 2 on the fraction). */
const DECIMALS: Partial<Record<MetricId, number>> = {
  sayDo: 2, scopeChange: 2, velocityCv: 2, goalHitRate: 2, throughputCv: 2, ageingWipShare: 2,
  bugRatio: 2, okrShare: 2, forecastAccuracy: 2, healthIndex: 0, deliveryForecast: 0,
  wip: 0, velocity: 0, throughput: 1, cycleP50: 1, cycleP85: 1, leadP85: 1, pulseScore: 1,
}

export type Improvement = 'better' | 'worse' | 'unchanged' | null

/** Better or worse only with a direction and both values; changes that vanish at display precision are unchanged. */
export function improvement(id: MetricId, current: number | null, previous: number | null): Improvement {
  const def = CATALOGUE[id]
  if (def.direction === 'neutral' || current === null || previous === null) return null
  const dp = 10 ** (DECIMALS[id] ?? 1)
  const delta = Math.round(current * dp) - Math.round(previous * dp)
  if (delta === 0) return 'unchanged'
  return (delta > 0) === (def.direction === 'higher') ? 'better' : 'worse'
}
