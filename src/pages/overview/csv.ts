import { formatMetricText } from '../../components/format'
import type { MetricId } from '../../metrics'
import type { TeamRow } from './teamRows'

export const SIGNAL_LABEL = { 'on-track': 'On track', watch: 'Watch', 'needs-attention': 'Needs attention' } as const

/** Matrix columns exported next to the team details. */
export const CSV_METRICS: { id: MetricId; header: string; value: (r: TeamRow) => number | null }[] = [
  { id: 'healthIndex', header: 'Health index', value: (r) => r.current.values.healthIndex },
  { id: 'sayDo', header: 'Completion ratio', value: (r) => r.current.values.sayDo },
  { id: 'cycleP85', header: 'Cycle time (85th pct)', value: (r) => r.current.values.cycleP85 },
  {
    id: 'velocityCv',
    header: 'Stability',
    value: (r) => (r.squad.teamType === 'scrum' ? r.current.values.velocityCv : r.current.values.throughputCv),
  },
  { id: 'scopeChange', header: 'Scope volatility', value: (r) => r.current.values.scopeChange },
  { id: 'forecastAccuracy', header: 'Forecasting accuracy', value: (r) => r.current.values.forecastAccuracy },
]

export const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)

export function teamsCsv(rows: TeamRow[]): string {
  const head = ['Team', 'Domain', 'Delivery Lead', 'Pod', 'Team type', 'Signal', ...CSV_METRICS.map((m) => m.header)]
  const lines = rows.map((r) => [
    r.squad.name, r.domain, r.lead, r.pod ?? '', r.squad.teamType === 'scrum' ? 'Scrum' : 'Kanban',
    SIGNAL_LABEL[r.signal.signal],
    ...CSV_METRICS.map((m) => {
      const v = m.value(r)
      return v === null ? '' : formatMetricText(m.id, v)
    }),
  ])
  return [head, ...lines].map((l) => l.map(cell).join(',')).join('\n')
}
