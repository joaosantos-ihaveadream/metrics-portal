import { useMemo } from 'react'
import { MdAddCircleOutline, MdBugReport, MdCheckCircleOutline, MdSwapVert } from 'react-icons/md'
import { DeltaChip } from '../../components/DeltaChip'
import { EmptyState } from '../../components/EmptyState'
import { KpiTile } from '../../components/KpiTile'
import { MetricDelta } from '../../components/MetricDelta'
import { PageHeader } from '../../components/PageHeader'
import { SortableTable, type Column } from '../../components/SortableTable'
import { StatusBadge } from '../../components/StatusBadge'
import { TeamAvatar } from '../../components/TeamAvatar'
import { BarChart } from '../../components/charts/BarChart'
import { LineChart } from '../../components/charts/LineChart'
import { formatMetric, formatMetricText } from '../../components/format'
import { useScoped } from '../../filters/FilterContext'
import {
  bugCountsFor, CATALOGUE, computePeriod, dayMonth, signalFor, trend, weeklyBugs, type Improvement, type Signal,
} from '../../metrics'
import { href } from '../../router/hashRouter'
import { teamRows, type TeamRow } from '../overview/teamRows'

const SIGNAL_ORDER: Record<Signal, number> = { 'needs-attention': 0, watch: 1, 'on-track': 2 }
const TONE_CELL: Record<Signal, string> = {
  'on-track': 'bg-good-bg text-good', watch: 'bg-warn-bg text-warn', 'needs-attention': 'bg-bad-bg text-bad',
}
const RAISED_RESOLVED = ['var(--color-series-2)', 'var(--color-series-1)']
const sign = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '')

/** Change in a plain count; `better` says which direction is an improvement. */
function CountDelta({ current, previous, better }: { current: number; previous: number; better: 'higher' | 'lower' | 'neutral' }) {
  const delta = current - previous
  const verdict: Improvement = better === 'neutral' ? null : delta === 0 ? 'unchanged' : (delta > 0) === (better === 'higher') ? 'better' : 'worse'
  return <DeltaChip delta={delta} improvement={verdict} text={delta === 0 ? '' : `${sign(delta)}${Math.abs(delta)}`} />
}

const columns: Column<TeamRow & { raised: number; resolved: number }>[] = [
  {
    id: 'team', header: 'Team', sortValue: (r) => r.squad.name,
    render: (r) => (
      <div className="flex items-center gap-3">
        <TeamAvatar name={r.squad.name} />
        <a href={href(`/teams/${r.squad.id}`)} className="font-semibold text-on-surface hover:underline">{r.squad.name}</a>
      </div>
    ),
  },
  {
    id: 'ratio', header: 'Bug ratio', align: 'right', tooltip: 'Bugs done ÷ all items done.', sortValue: (r) => r.current.values.bugRatio,
    render: (r) => {
      const s = signalFor('bugRatio', r.current.values.bugRatio)
      return <span className={`inline-block min-w-12 rounded-control px-2 py-1 text-center font-semibold ${s ? TONE_CELL[s] : 'text-on-surface-variant'}`}>{formatMetricText('bugRatio', r.current.values.bugRatio)}</span>
    },
  },
  { id: 'raised', header: 'Raised', align: 'right', tooltip: 'Bugs created in the period.', sortValue: (r) => r.raised, render: (r) => r.raised },
  { id: 'resolved', header: 'Resolved', align: 'right', tooltip: 'Bugs finished in the period.', sortValue: (r) => r.resolved, render: (r) => r.resolved },
  { id: 'net', header: 'Net', align: 'right', tooltip: 'Raised minus resolved. Positive means the bug backlog grew.', sortValue: (r) => r.raised - r.resolved, render: (r) => `${sign(r.raised - r.resolved)}${Math.abs(r.raised - r.resolved)}` },
  {
    id: 'signal', header: 'Signal', tooltip: 'Worst of the team’s signal metrics.', sortValue: (r) => SIGNAL_ORDER[r.signal.signal],
    render: (r) => <StatusBadge signal={r.signal.signal} />,
  },
]

export function Quality() {
  const view = useScoped()

  const data = useMemo(() => {
    if (!view || !view.squadIds.length) return null
    const { dataset, squadIds, period } = view
    const p = computePeriod(dataset, squadIds, period)
    return {
      ...p,
      raised: bugCountsFor(dataset, squadIds, p.window),
      before: bugCountsFor(dataset, squadIds, p.previousWindow),
      weekly: weeklyBugs(dataset, squadIds, p.window),
      ratioTrend: trend(dataset, squadIds, 'bugRatio'),
      rows: teamRows(dataset, squadIds, period).map((r) => {
        const c = bugCountsFor(dataset, [r.squad.id], p.window)
        return { ...r, raised: c.raised, resolved: c.resolved }
      }),
    }
  }, [view])

  if (!view) return null
  const header = <PageHeader title="Quality" question="how much capacity goes to fixing rather than building?" />
  if (!data) return <>{header}<EmptyState /></>

  const { current, previous, raised: now, before, weekly, ratioTrend, rows } = data
  const note = `vs prev. ${view.period}d`
  const target = CATALOGUE.bugRatio.thresholds!.good

  return (
    <>
      {header}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          label="Bug ratio" icon={MdBugReport} description={CATALOGUE.bugRatio.description}
          {...formatMetric('bugRatio', current.values.bugRatio)} trend={ratioTrend.map((p) => p.value)}
          delta={<MetricDelta id="bugRatio" current={current.values.bugRatio} previous={previous.values.bugRatio} />}
          deltaNote={note} signal={signalFor('bugRatio', current.values.bugRatio)}
        />
        <KpiTile
          label="Bugs raised" icon={MdAddCircleOutline} description="Bugs created in the period."
          value={String(now.raised)} delta={<CountDelta current={now.raised} previous={before.raised} better="lower" />} deltaNote={note}
        />
        <KpiTile
          label="Bugs resolved" icon={MdCheckCircleOutline} description="Bugs finished in the period."
          value={String(now.resolved)} delta={<CountDelta current={now.resolved} previous={before.resolved} better="higher" />} deltaNote={note}
        />
        <KpiTile
          label="Net bug backlog change" icon={MdSwapVert} description="Bugs raised minus bugs resolved. Positive means the backlog grew."
          value={`${sign(now.net)}${Math.abs(now.net)}`} delta={<CountDelta current={now.net} previous={before.net} better="lower" />} deltaNote={note}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section aria-label="Bug ratio trend" className="rounded-card border border-outline-variant bg-surface-container-lowest p-5">
          <h2 className="text-title-lg text-on-surface">Bug ratio trend</h2>
          <p className="mb-3 text-label-md text-on-surface-variant">Lower is better · rolling 4 weeks</p>
          <LineChart
            labels={ratioTrend.map((p) => p.label)}
            series={[{ name: 'Bug ratio', values: ratioTrend.map((p) => p.value) }]}
            target={{ value: target, label: 'Healthy ≤ 20%' }}
            format={(v) => `${Math.round(v * 100)}%`}
          />
        </section>
        <section aria-label="Bugs raised vs resolved" className="rounded-card border border-outline-variant bg-surface-container-lowest p-5">
          <h2 className="text-title-lg text-on-surface">Bugs raised vs resolved</h2>
          <p className="mb-3 text-label-md text-on-surface-variant">Per week</p>
          <BarChart
            labels={weekly.map((w) => dayMonth(w.end))}
            series={[{ name: 'Raised', values: weekly.map((w) => w.raised) }, { name: 'Resolved', values: weekly.map((w) => w.resolved) }]}
            colours={RAISED_RESOLVED}
          />
        </section>
      </div>

      {view.squads.length > 0 && (
        <section aria-label="Quality by team" className="mt-8">
          <h2 className="mb-3 text-title-lg text-on-surface">Quality by team</h2>
          <SortableTable columns={columns} rows={rows} rowKey={(r) => r.squad.id} initialSort={{ id: 'ratio', desc: true }} />
        </section>
      )}
    </>
  )
}
