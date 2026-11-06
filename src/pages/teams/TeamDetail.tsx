import { useMemo } from 'react'
import { MdArrowBack, MdBugReport, MdSpeed, MdTimelapse, MdTrackChanges, MdTrendingFlat, MdWarningAmber } from 'react-icons/md'
import { KpiTile } from '../../components/KpiTile'
import { MetricDelta } from '../../components/MetricDelta'
import { SortableTable, type Column } from '../../components/SortableTable'
import { StatusBadge } from '../../components/StatusBadge'
import { TeamAvatar } from '../../components/TeamAvatar'
import { BarChart } from '../../components/charts/BarChart'
import { LineChart } from '../../components/charts/LineChart'
import { ScatterChart } from '../../components/charts/ScatterChart'
import { formatMetric } from '../../components/format'
import { ALL_SCOPE } from '../../filters/scope'
import { useFilters, useScoped } from '../../filters/FilterContext'
import {
  ageingItems, CATALOGUE, dayMonth, finishedItems, mean, signalFor, sprintPoints, toMs, trend, weeklyThroughput,
  windowEndingAt,
  type AgeingItem,
} from '../../metrics'
import { href } from '../../router/hashRouter'
import { buildInsights } from '../overview/insights'
import { InsightsPanel } from '../overview/InsightsPanel'
import { teamRows } from '../overview/teamRows'
import { sprintHistory, workByInitiative, type SprintRow } from './teamData'

const card = 'rounded-card border border-outline-variant bg-surface-container-lowest p-5'
const pct = (v: number | null) => (v === null ? '—' : `${Math.round(v * 100)}%`)
const shortDate = (iso: string) => dayMonth(new Date(iso).getTime())

export function TeamDetail({ id }: { id: string }) {
  const view = useScoped()
  const { setScope } = useFilters()

  const data = useMemo(() => {
    if (!view) return null
    const { dataset, period } = view
    const [row] = teamRows(dataset, [id], period)
    if (!row) return null
    const w = windowEndingAt(toMs(dataset.asOf), period)
    return {
      row,
      window: w,
      finished: finishedItems(dataset, [id], w),
      weekly: weeklyThroughput(dataset, [id], w),
      wip: ageingItems(dataset, [id], w),
      sprints: sprintPoints(dataset, id, w),
      history: sprintHistory(dataset, id, w),
      initiatives: workByInitiative(dataset, id, w),
      p85Trend: trend(dataset, [id], 'cycleP85'),
      stabilityTrend: trend(dataset, [id], row.squad.teamType === 'scrum' ? 'sayDo' : 'throughputCv'),
      insights: buildInsights([row]),
    }
  }, [view, id])

  if (!view) return null
  if (!data) {
    return (
      <>
        <a href={href('/teams')} className="inline-flex items-center gap-1 text-body-sm font-semibold text-primary hover:underline"><MdArrowBack size={16} aria-hidden /> All teams</a>
        <h1 className="mt-4 text-headline-md text-on-surface">Team not found</h1>
        <p className="mt-1 text-body-sm text-on-surface-variant">No team matches that link.</p>
      </>
    )
  }

  const { row, window, finished, weekly, wip, sprints, history, initiatives, p85Trend, stabilityTrend, insights } = data
  const { squad, current, previous } = row
  const scrum = squad.teamType === 'scrum'
  const v = current.values
  const pv = previous.values
  const note = `vs prev. ${view.period}d`
  const isMine = view.scope.kind === 'team' && view.scope.id === squad.id
  const stream = view.dataset.valueStreams.find((s) => s.id === squad.valueStreamId)?.name
  const subtitle = [
    row.domain, stream, `Delivery Lead: ${row.lead}`, row.pod && `${row.pod} pod`, `Board ${squad.boardKey}`, `last ${view.period} days`,
  ].filter(Boolean).join(' · ')
  const average = mean(weekly.map((x) => x.value))
  const maxInitiative = Math.max(1, ...initiatives.map((i) => i.count))

  const wipColumns: Column<AgeingItem>[] = [
    { id: 'key', header: 'Item', sortValue: (r) => r.item.key, render: (r) => <span className="font-semibold">{r.item.key}</span> },
    { id: 'summary', header: 'Summary', render: (r) => r.item.summary },
    { id: 'age', header: 'Age (days)', align: 'right', sortValue: (r) => r.age, render: (r) => r.age.toFixed(1) },
    {
      id: 'multiple', header: 'vs team p85', align: 'right', sortValue: (r) => r.multiple,
      tooltip: 'Age as a multiple of this team’s 85th percentile cycle time.',
      render: (r) => r.multiple === null ? '—' : (
        <span className={r.multiple > 1 ? 'inline-flex items-center gap-1 font-semibold text-warn' : ''}>
          {r.multiple > 1 && <MdWarningAmber size={14} aria-hidden />}{r.multiple.toFixed(1)}×
          {r.multiple > 1 && <span className="sr-only"> older than the team’s 85th percentile</span>}
        </span>
      ),
    },
  ]
  const sprintColumns: Column<SprintRow>[] = [
    { id: 'name', header: 'Sprint', sortValue: (r) => r.name, render: (r) => <span className="font-semibold">{r.name}</span> },
    { id: 'ended', header: 'Ended', sortValue: (r) => r.endDate, render: (r) => shortDate(r.endDate) },
    { id: 'committed', header: 'Committed', align: 'right', sortValue: (r) => r.committed, render: (r) => r.committed },
    { id: 'added', header: 'Added', align: 'right', sortValue: (r) => r.added, render: (r) => r.added },
    { id: 'velocity', header: 'Velocity', align: 'right', sortValue: (r) => r.velocity, render: (r) => r.velocity },
    { id: 'sayDo', header: 'Say/Do', align: 'right', sortValue: (r) => r.sayDo, render: (r) => pct(r.sayDo) },
    {
      id: 'goal', header: 'Goal', render: (r) => (
        <span>{r.goal}{r.goalMet !== null && <span className="ml-1 text-label-sm text-outline">· {r.goalMet ? 'met' : 'not met'}</span>}</span>
      ),
    },
  ]

  return (
    <>
      <header className="mb-8">
        <a href={href('/teams')} className="inline-flex items-center gap-1 text-body-sm font-semibold text-primary hover:underline">
          <MdArrowBack size={16} aria-hidden /> All teams
        </a>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <TeamAvatar name={squad.name} size={40} />
          <h1 className="text-headline-md text-on-surface">{squad.name}</h1>
          <span className="rounded-full border border-outline-variant px-2 py-0.5 text-label-sm text-on-surface-variant">{scrum ? 'Scrum' : 'Kanban'}</span>
          <StatusBadge signal={row.signal.signal} />
          <button
            type="button" onClick={() => setScope(isMine ? ALL_SCOPE : { kind: 'team', id: squad.id })}
            className="ml-auto rounded-control border border-outline-variant bg-white px-3 py-1.5 text-label-md hover:bg-surface-container-low"
          >
            {isMine ? 'Back to all teams view' : 'Make this my view'}
          </button>
        </div>
        <p className="mt-2 text-body-sm text-on-surface-variant">{subtitle}</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {scrum ? (
          <KpiTile
            label="Say/Do" icon={MdTrackChanges} description={CATALOGUE.sayDo.description}
            {...formatMetric('sayDo', v.sayDo)} trend={stabilityTrend.map((t) => t.value)}
            delta={<MetricDelta id="sayDo" current={v.sayDo} previous={pv.sayDo} />} deltaNote={note}
            signal={signalFor('sayDo', v.sayDo)}
          />
        ) : (
          <KpiTile
            label="Throughput variability" icon={MdTrendingFlat} description={CATALOGUE.throughputCv.description}
            {...formatMetric('throughputCv', v.throughputCv)} trend={stabilityTrend.map((t) => t.value)}
            delta={<MetricDelta id="throughputCv" current={v.throughputCv} previous={pv.throughputCv} />} deltaNote={note}
            signal={signalFor('throughputCv', v.throughputCv)}
          />
        )}
        <KpiTile
          label="Cycle time (85th pct)" icon={MdTimelapse} description={CATALOGUE.cycleP85.description}
          {...formatMetric('cycleP85', v.cycleP85)} trend={p85Trend.map((t) => t.value)}
          delta={<MetricDelta id="cycleP85" current={v.cycleP85} previous={pv.cycleP85} />} deltaNote={note}
          signal={signalFor('cycleP85', v.cycleP85)}
        />
        {scrum ? (
          <KpiTile
            label="Avg velocity" icon={MdSpeed} description={CATALOGUE.velocity.description}
            {...formatMetric('velocity', v.velocity)}
            delta={<MetricDelta id="velocity" current={v.velocity} previous={pv.velocity} />} deltaNote={note}
            footer={CATALOGUE.velocity.caveat}
          />
        ) : (
          <KpiTile
            label="Throughput" icon={MdSpeed} description={CATALOGUE.throughput.description}
            {...formatMetric('throughput', v.throughput)}
            delta={<MetricDelta id="throughput" current={v.throughput} previous={pv.throughput} />} deltaNote={note}
          />
        )}
        <KpiTile
          label="Bug ratio" icon={MdBugReport} description={CATALOGUE.bugRatio.description}
          {...formatMetric('bugRatio', v.bugRatio)}
          delta={<MetricDelta id="bugRatio" current={v.bugRatio} previous={pv.bugRatio} />} deltaNote={note}
          signal={signalFor('bugRatio', v.bugRatio)}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section aria-label={scrum ? 'Sprints: committed vs completed' : 'Weekly throughput'} className={card}>
          <h2 className="mb-3 text-title-lg text-on-surface">{scrum ? 'Sprints: committed vs completed' : 'Weekly throughput'}</h2>
          {scrum ? (
            <BarChart
              labels={sprints.map((s) => s.name)}
              series={[
                { name: 'Committed', values: sprints.map((s) => s.committed) },
                { name: 'Completed', values: sprints.map((s) => s.completedCommitted) },
              ]}
              extraRows={(i) => [{ label: 'Say/Do', value: pct(sprints[i].sayDo) }]}
            />
          ) : (
            <BarChart
              labels={weekly.map((x) => dayMonth(x.end))}
              series={[{ name: 'Items done', values: weekly.map((x) => x.value) }]}
              reference={average === null ? undefined : { value: average, label: `Average ${average.toFixed(1)}` }}
            />
          )}
        </section>
        <section aria-label="Cycle time trend" className={card}>
          <h2 className="mb-3 text-title-lg text-on-surface">Cycle time (85th pct) trend</h2>
          <LineChart
            labels={p85Trend.map((t) => t.label)}
            series={[{ name: 'Cycle time (85th pct)', values: p85Trend.map((t) => t.value) }]}
            target={{ value: 10, label: 'Target 10d' }}
            format={(x) => `${Math.round(x * 10) / 10}d`}
          />
        </section>
      </div>

      <section aria-label="Cycle time scatter" className={`mt-4 ${card}`}>
        <h2 className="mb-3 text-title-lg text-on-surface">Cycle time</h2>
        <ScatterChart
          points={finished.map((f) => ({ date: f.doneAt, value: f.cycleDays, label: `${f.key} · ${f.summary}` }))}
          domain={[window.start, window.end]}
          references={v.cycleP85 === null ? [] : [{ value: v.cycleP85, label: `85th pct ${v.cycleP85.toFixed(1)}d` }]}
          format={(x) => `${Math.round(x * 10) / 10}d`}
        />
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section aria-label="Where the work went" className={card}>
          <h2 className="mb-3 text-title-lg text-on-surface">Where the work went</h2>
          {initiatives.length === 0 ? (
            <p className="text-body-sm text-on-surface-variant">No finished work in this period.</p>
          ) : (
            <ul className="space-y-2">
              {initiatives.map((i) => (
                <li key={i.name}>
                  <div className="flex justify-between text-body-sm"><span>{i.name}</span><span className="font-semibold">{i.count}</span></div>
                  <div className="mt-1 h-2 rounded-full bg-surface-container"><div className="h-2 rounded-full bg-series-1" style={{ width: `${(i.count / maxInitiative) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-label-sm text-outline">Items finished, by initiative.</p>
        </section>
        <section aria-label="Work in progress">
          <h2 className="mb-3 text-title-lg text-on-surface">Work in progress, oldest first</h2>
          {wip.length === 0
            ? <div className={`${card} text-body-sm text-on-surface-variant`}>Nothing in progress.</div>
            : <SortableTable columns={wipColumns} rows={wip} rowKey={(r) => r.item.key} initialSort={{ id: 'age', desc: true }} />}
        </section>
      </div>

      {scrum && (
        <section aria-label="Sprint history" className="mt-8">
          <h2 className="mb-3 text-title-lg text-on-surface">Sprint history</h2>
          <SortableTable columns={sprintColumns} rows={history} rowKey={(r) => r.id} initialSort={{ id: 'ended', desc: true }} />
        </section>
      )}

      <div className="mt-8">
        <InsightsPanel insights={insights} title="Conversation starters" />
      </div>
    </>
  )
}
