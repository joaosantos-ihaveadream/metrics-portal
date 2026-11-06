import { useMemo, useState } from 'react'
import type { IconType } from 'react-icons'
import { MdShowChart, MdSwapHoriz, MdTaskAlt, MdTimer, MdTrackChanges } from 'react-icons/md'
import { EmptyState } from '../../components/EmptyState'
import { KpiTile } from '../../components/KpiTile'
import { MetricDelta } from '../../components/MetricDelta'
import { PageHeader } from '../../components/PageHeader'
import { SegmentedToggle } from '../../components/SegmentedToggle'
import { SortableTable, type Column } from '../../components/SortableTable'
import { StatusBadge } from '../../components/StatusBadge'
import { TeamAvatar } from '../../components/TeamAvatar'
import { BarChart } from '../../components/charts/BarChart'
import { LineChart } from '../../components/charts/LineChart'
import { Sparkline } from '../../components/charts/Sparkline'
import { formatMetric, formatMetricText } from '../../components/format'
import type { TeamType } from '../../data/model'
import { useScoped } from '../../filters/FilterContext'
import {
  CATALOGUE, computePeriod, recentSayDo, signalFor, sprintPoints, trend, trendWindowText,
  weeklyThroughput, type MetricId, type Signal,
} from '../../metrics'
import { href } from '../../router/hashRouter'
import { teamRows, type TeamRow } from '../overview/teamRows'

interface Box { id: MetricId; label: string; icon: IconType }

const SCRUM_BOXES: Box[] = [
  { id: 'cycleP85', label: 'Cycle time (85th pct)', icon: MdTimer },
  { id: 'sayDo', label: 'Completion ratio', icon: MdTaskAlt },
  { id: 'velocityCv', label: 'Stability', icon: MdShowChart },
  { id: 'scopeChange', label: 'Scope volatility', icon: MdSwapHoriz },
  { id: 'forecastAccuracy', label: 'Forecasting accuracy', icon: MdTrackChanges },
]
const KANBAN_BOXES: Box[] = [
  { id: 'cycleP85', label: 'Cycle time (85th pct)', icon: MdTimer },
  { id: 'throughputCv', label: 'Stability', icon: MdShowChart },
  { id: 'forecastAccuracy', label: 'Forecasting accuracy', icon: MdTrackChanges },
]
const SIGNAL_ORDER: Record<Signal, number> = { 'needs-attention': 0, watch: 1, 'on-track': 2 }
const TONE_CELL: Record<Signal, string> = {
  'on-track': 'bg-good-bg text-good', watch: 'bg-warn-bg text-warn', 'needs-attention': 'bg-bad-bg text-bad',
}
const LONE_LAST = 'md:[&:last-child:nth-child(odd)]:col-span-2'

function Cell({ id, value }: { id: MetricId; value: number | null }) {
  const s = signalFor(id, value)
  return (
    <span className={`inline-block min-w-12 rounded-control px-2 py-1 text-center font-semibold ${s ? TONE_CELL[s] : 'text-on-surface-variant'}`}>
      {formatMetricText(id, value)}
    </span>
  )
}

function TeamCell({ r }: { r: TeamRow }) {
  return (
    <div className="flex items-center gap-3">
      <TeamAvatar name={r.squad.name} />
      <a href={href(`/teams/${r.squad.id}`)} className="font-semibold text-on-surface hover:underline">{r.squad.name}</a>
    </div>
  )
}

const signalColumn = (header: string, tooltip: string, pick: (r: TeamRow) => Signal | null): Column<TeamRow> => ({
  id: 'signal', header, tooltip,
  sortValue: (r) => { const s = pick(r); return s ? SIGNAL_ORDER[s] : null },
  render: (r) => { const s = pick(r); return s ? <StatusBadge signal={s} /> : <span className="text-outline">—</span> },
})

const axisFormat = (id: MetricId) => (v: number) => {
  const { unit } = CATALOGUE[id]
  return unit === '%' ? `${Math.round(v * 100)}%` : unit === 'days' ? `${v}d` : String(v)
}

function TrendChart({ id, label, points }: { id: MetricId; label: string; points: { label: string; value: number | null }[] }) {
  const def = CATALOGUE[id]
  const target = def.thresholds?.good
  const max = Math.max(target ?? 0, ...points.map((p) => p.value ?? 0)) * 1.15
  return (
    <section aria-label={`${label} trend`} className={`rounded-card border border-outline-variant bg-surface-container-lowest p-5 ${LONE_LAST}`}>
      <h3 className="text-title-lg text-on-surface">{label}</h3>
      <p className="mb-3 text-label-md text-on-surface-variant">
        {def.direction === 'higher' ? 'Higher' : 'Lower'} is better · {trendWindowText(id)}
      </p>
      <LineChart
        labels={points.map((p) => p.label)}
        series={[{ name: label, values: points.map((p) => p.value) }]}
        target={target === undefined ? undefined : { value: target, label: `On track: ${def.direction === 'higher' ? '≥' : '≤'} ${formatMetricText(id, target)}` }}
        yMax={def.unit === '%' ? Math.min(1, max) : max}
        format={axisFormat(id)}
      />
    </section>
  )
}

const scrumColumns: Column<TeamRow & { sayDoTrend: (number | null)[] }>[] = [
  { id: 'team', header: 'Team', sortValue: (r) => r.squad.name, render: (r) => <TeamCell r={r} /> },
  { id: 'sayDo', header: 'Say/Do', align: 'right', tooltip: 'Completed committed points ÷ committed points.', sortValue: (r) => r.current.values.sayDo, render: (r) => <Cell id="sayDo" value={r.current.values.sayDo} /> },
  { id: 'spark', header: 'Last 8 sprints', tooltip: 'Say/Do for each of the last 8 sprints.', render: (r) => <Sparkline values={r.sayDoTrend} /> },
  { id: 'scope', header: 'Scope change', align: 'right', tooltip: 'Points added mid-sprint ÷ committed points.', sortValue: (r) => r.current.values.scopeChange, render: (r) => <Cell id="scopeChange" value={r.current.values.scopeChange} /> },
  { id: 'cv', header: 'Velocity variability', align: 'right', tooltip: 'Spread of sprint velocity relative to its mean. Lower is steadier.', sortValue: (r) => r.current.values.velocityCv, render: (r) => <Cell id="velocityCv" value={r.current.values.velocityCv} /> },
  { id: 'goal', header: 'Goal hit rate', align: 'right', tooltip: 'Sprints with the goal met ÷ sprints with a recorded outcome.', sortValue: (r) => r.current.values.goalHitRate, render: (r) => <Cell id="goalHitRate" value={r.current.values.goalHitRate} /> },
  signalColumn('Say/Do signal', 'On track at 80% or more, Watch at 65% or more.', (r) => signalFor('sayDo', r.current.values.sayDo)),
]

const kanbanColumns: Column<TeamRow & { weekly: number[] }>[] = [
  { id: 'team', header: 'Team', sortValue: (r) => r.squad.name, render: (r) => <TeamCell r={r} /> },
  { id: 'spark', header: 'Weekly throughput', tooltip: 'Items done in each week of the period.', render: (r) => <Sparkline values={r.weekly} /> },
  { id: 'cv', header: 'Throughput variability', align: 'right', tooltip: 'Spread of weekly throughput relative to its mean. Lower is steadier.', sortValue: (r) => r.current.values.throughputCv, render: (r) => <Cell id="throughputCv" value={r.current.values.throughputCv} /> },
  { id: 'cycle', header: 'Cycle time', align: 'right', tooltip: 'Cycle time, 85th percentile.', sortValue: (r) => r.current.values.cycleP85, render: (r) => <Cell id="cycleP85" value={r.current.values.cycleP85} /> },
  signalColumn('Signal', 'Worst of the team’s signal metrics.', (r) => r.signal.signal),
]

export function Health() {
  const view = useScoped()
  const [pick, setPick] = useState<TeamType>('scrum')

  const counts = useMemo(() => ({
    scrum: view?.squads.filter((s) => s.teamType === 'scrum').length ?? 0,
    kanban: view?.squads.filter((s) => s.teamType === 'kanban').length ?? 0,
  }), [view])
  const type: TeamType = counts[pick] === 0 && counts[pick === 'scrum' ? 'kanban' : 'scrum'] > 0 ? (pick === 'scrum' ? 'kanban' : 'scrum') : pick

  const data = useMemo(() => {
    if (!view) return null
    const ids = view.squads.filter((s) => s.teamType === type).map((s) => s.id)
    if (!ids.length) return null
    const { dataset, period } = view
    const { window, current, previous } = computePeriod(dataset, ids, period)
    const boxes = type === 'scrum' ? SCRUM_BOXES : KANBAN_BOXES
    const rows = teamRows(dataset, ids, period)
    return {
      ids, window, current, previous, boxes,
      trends: Object.fromEntries(boxes.map((b) => [b.id, trend(dataset, ids, b.id)])) as Record<string, ReturnType<typeof trend>>,
      scrumRows: rows.map((r) => ({ ...r, sayDoTrend: recentSayDo(dataset, r.squad.id, window.end) })),
      kanbanRows: rows.map((r) => ({ ...r, weekly: weeklyThroughput(dataset, [r.squad.id], window).map((w) => w.value) })),
      sprints: ids.length === 1 ? sprintPoints(dataset, ids[0], window) : [],
    }
  }, [view, type])

  if (!view) return null
  const header = <PageHeader title="Health index" question="can we forecast what we will deliver?" />
  const toggle = (
    <div className="mb-4 flex justify-end">
      <SegmentedToggle<TeamType>
        label="Team type" value={type} onChange={setPick}
        options={[{ value: 'scrum', label: `Scrum (${counts.scrum})` }, { value: 'kanban', label: `Kanban (${counts.kanban})` }]}
      />
    </div>
  )
  if (!data) return <>{header}<EmptyState /></>

  const { current, previous, boxes, trends, sprints } = data
  const note = `vs prev. ${view.period}d`

  return (
    <>
      {header}
      {toggle}
      <section aria-label={type === 'scrum' ? 'Scrum teams' : 'Kanban teams'}>
        <div className={`grid gap-4 sm:grid-cols-2 ${type === 'scrum' ? 'xl:grid-cols-5' : 'xl:grid-cols-3'}`}>
          {boxes.map((b) => (
            <KpiTile
              key={b.id} label={b.label} icon={b.icon} description={CATALOGUE[b.id].description}
              {...formatMetric(b.id, current.values[b.id])}
              trend={trends[b.id].map((p) => p.value)}
              delta={<MetricDelta id={b.id} current={current.values[b.id]} previous={previous.values[b.id]} />}
              deltaNote={note} signal={signalFor(b.id, current.values[b.id])}
            />
          ))}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {boxes.map((b) => <TrendChart key={b.id} id={b.id} label={b.label} points={trends[b.id]} />)}
        </div>

        {type === 'kanban' && (
          <p className="mt-6 rounded-card border border-outline-variant bg-surface-container-lowest p-4 text-body-sm text-on-surface-variant">
            Kanban teams do not commit to sprints, so predictability is read from how steady throughput is week to week.
          </p>
        )}

        {type === 'scrum' && sprints.length > 0 && (
          <section aria-label="Committed vs completed" className="mt-6 rounded-card border border-outline-variant bg-surface-container-lowest p-5">
            <h3 className="mb-3 text-title-lg text-on-surface">Committed vs completed</h3>
            <BarChart
              labels={sprints.map((s) => s.name)}
              series={[
                { name: 'Committed', values: sprints.map((s) => s.committed) },
                { name: 'Completed of committed', values: sprints.map((s) => s.completedCommitted) },
                { name: 'Added mid-sprint', values: sprints.map((s) => s.added) },
              ]}
              extraRows={(i) => [
                { label: 'Say/Do', value: sprints[i].sayDo === null ? '—' : `${Math.round(sprints[i].sayDo! * 100)}%` },
                { label: 'Velocity', value: `${sprints[i].velocity} pts` },
                { label: 'Goal met', value: sprints[i].goalMet === null ? '—' : sprints[i].goalMet ? 'Yes' : 'No' },
              ]}
            />
          </section>
        )}

        <h2 className="mb-3 mt-8 text-title-lg text-on-surface">{type === 'scrum' ? 'Scrum team breakdown' : 'Kanban team breakdown'}</h2>
        {type === 'scrum'
          ? <SortableTable columns={scrumColumns} rows={data.scrumRows} rowKey={(r) => r.squad.id} initialSort={{ id: 'sayDo' }} />
          : <SortableTable columns={kanbanColumns} rows={data.kanbanRows} rowKey={(r) => r.squad.id} initialSort={{ id: 'signal' }} />}
      </section>
    </>
  )
}

