import { useMemo } from 'react'
import { MdFileDownload, MdHourglassEmpty, MdSpeed, MdTimelapse, MdTimer, MdWarningAmber } from 'react-icons/md'
import { EmptyState } from '../../components/EmptyState'
import { KpiTile } from '../../components/KpiTile'
import { MetricDelta } from '../../components/MetricDelta'
import { PageHeader } from '../../components/PageHeader'
import { SortableTable, type Column } from '../../components/SortableTable'
import { downloadCsv } from '../../components/download'
import { BarChart } from '../../components/charts/BarChart'
import { ScatterChart } from '../../components/charts/ScatterChart'
import { formatMetric } from '../../components/format'
import { useScoped } from '../../filters/FilterContext'
import {
  ageingItems, CATALOGUE, computePeriod, dayMonth, finishedItems, histogram, mean, signalFor, trend,
  weeklyThroughput, type AgeingItem,
} from '../../metrics'
import { cell } from '../overview/csv'

const days = (v: number) => `${v.toFixed(1)}d`

function agingCsv(rows: AgeingItem[], teamName: (id: string) => string): string {
  const head = ['Key', 'Summary', 'Team', 'Type', 'Age (days)', 'Team p85 (days)', 'Multiple of p85']
  const lines = rows.map((r) => [
    r.item.key, r.item.summary, teamName(r.item.squadId), r.item.type, r.age.toFixed(1),
    r.teamP85 === null ? '' : r.teamP85.toFixed(1), r.multiple === null ? '' : r.multiple.toFixed(2),
  ])
  return [head, ...lines].map((l) => l.map(cell).join(',')).join('\n')
}

export function Flow() {
  const view = useScoped()

  const data = useMemo(() => {
    if (!view || !view.squadIds.length) return null
    const { dataset, squadIds, period } = view
    const p = computePeriod(dataset, squadIds, period)
    const finished = finishedItems(dataset, squadIds, p.window)
    return {
      ...p,
      finished,
      weekly: weeklyThroughput(dataset, squadIds, p.window),
      bins: histogram(finished.map((f) => f.cycleDays)),
      wip: ageingItems(dataset, squadIds, p.window),
      p85Trend: trend(dataset, squadIds, 'cycleP85').map((t) => t.value),
    }
  }, [view])

  if (!view) return null
  const header = <PageHeader title="Flow" question="how smoothly does work move from started to done?" />
  if (!data) return <>{header}<EmptyState /></>

  const { current, previous, window, finished, weekly, bins, wip, p85Trend } = data
  const note = `vs prev. ${view.period}d`
  const teamName = (id: string) => view.squads.find((s) => s.id === id)?.name ?? id
  const average = mean(weekly.map((w) => w.value))
  const multipleOf = (r: AgeingItem) => r.multiple

  const columns: Column<AgeingItem>[] = [
    { id: 'key', header: 'Item', sortValue: (r) => r.item.key, render: (r) => <span className="font-semibold">{r.item.key}</span> },
    { id: 'summary', header: 'Summary', render: (r) => r.item.summary },
    { id: 'team', header: 'Team', sortValue: (r) => teamName(r.item.squadId), render: (r) => teamName(r.item.squadId) },
    { id: 'type', header: 'Type', sortValue: (r) => r.item.type, render: (r) => r.item.type },
    { id: 'age', header: 'Age (days)', align: 'right', tooltip: 'Days since the item was started.', sortValue: (r) => r.age, render: (r) => r.age.toFixed(1) },
    {
      id: 'multiple', header: 'vs team p85', align: 'right',
      tooltip: 'Age as a multiple of the team’s 85th percentile cycle time. Above 1× is older than most finished work.',
      sortValue: multipleOf,
      render: (r) => r.multiple === null ? '—' : (
        <span className={r.multiple > 1 ? 'inline-flex items-center gap-1 font-semibold text-warn' : ''}>
          {r.multiple > 1 && <MdWarningAmber size={14} aria-hidden />}
          {r.multiple.toFixed(1)}×
          {r.multiple > 1 && <span className="sr-only"> older than the team’s 85th percentile</span>}
        </span>
      ),
    },
  ]

  return (
    <>
      {header}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          label="Cycle time (50th pct)" icon={MdTimer} description={CATALOGUE.cycleP50.description}
          {...formatMetric('cycleP50', current.values.cycleP50)}
          delta={<MetricDelta id="cycleP50" current={current.values.cycleP50} previous={previous.values.cycleP50} />}
          deltaNote={note}
        />
        <KpiTile
          label="Cycle time (85th pct)" icon={MdTimelapse} description={CATALOGUE.cycleP85.description}
          {...formatMetric('cycleP85', current.values.cycleP85)} trend={p85Trend}
          delta={<MetricDelta id="cycleP85" current={current.values.cycleP85} previous={previous.values.cycleP85} />}
          deltaNote={note} signal={signalFor('cycleP85', current.values.cycleP85)}
        />
        <KpiTile
          label="Throughput" icon={MdSpeed} description={CATALOGUE.throughput.description}
          {...formatMetric('throughput', current.values.throughput)}
          delta={<MetricDelta id="throughput" current={current.values.throughput} previous={previous.values.throughput} />}
          deltaNote={note}
          footer={view.squads.length > 1 ? CATALOGUE.throughput.caveat : undefined}
        />
        <KpiTile
          label={`Ageing WIP (${current.values.wip ?? 0} in progress)`} icon={MdHourglassEmpty} description={CATALOGUE.ageingWipShare.description}
          {...formatMetric('ageingWipShare', current.values.ageingWipShare)}
          delta={<MetricDelta id="ageingWipShare" current={current.values.ageingWipShare} previous={previous.values.ageingWipShare} />}
          deltaNote={note} signal={signalFor('ageingWipShare', current.values.ageingWipShare)}
        />
      </div>

      <section aria-label="Cycle time scatter" className="mt-6 rounded-card border border-outline-variant bg-surface-container-lowest p-5">
        <h2 className="mb-3 text-title-lg text-on-surface">Cycle time</h2>
        <ScatterChart
          points={finished.map((f) => ({ date: f.doneAt, value: f.cycleDays, label: `${f.key} · ${f.summary}` }))}
          domain={[window.start, window.end]}
          references={[
            ...(current.values.cycleP50 === null ? [] : [{ value: current.values.cycleP50, label: `50th pct ${days(current.values.cycleP50)}` }]),
            ...(current.values.cycleP85 === null ? [] : [{ value: current.values.cycleP85, label: `85th pct ${days(current.values.cycleP85)}` }]),
          ]}
          format={(v) => `${Math.round(v * 10) / 10}d`}
        />
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section aria-label="Weekly throughput" className="rounded-card border border-outline-variant bg-surface-container-lowest p-5">
          <h2 className="mb-3 text-title-lg text-on-surface">Weekly throughput</h2>
          <BarChart
            labels={weekly.map((w) => dayMonth(w.end))}
            series={[{ name: 'Items done', values: weekly.map((w) => w.value) }]}
            reference={average === null ? undefined : { value: average, label: `Average ${average.toFixed(1)}` }}
          />
        </section>
        <section aria-label="Cycle time distribution" className="rounded-card border border-outline-variant bg-surface-container-lowest p-5">
          <h2 className="mb-3 text-title-lg text-on-surface">Cycle time distribution</h2>
          <BarChart
            labels={bins.map((b) => b.label)}
            series={[{ name: 'Items', values: bins.map((b) => b.count) }]}
            extraRows={(i) => [{ label: 'Share', value: `${Math.round(bins[i].share * 100)}%` }]}
          />
          <p className="mt-1 text-label-sm text-outline">Days from started to done.</p>
        </section>
      </div>

      <section aria-label="Work in progress" className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-title-lg text-on-surface">Work in progress, oldest first</h2>
          <button
            type="button" onClick={() => downloadCsv('work-in-progress.csv', agingCsv(wip, teamName))}
            className="inline-flex items-center gap-1 rounded-control border border-outline-variant bg-white px-3 py-1.5 text-label-md hover:bg-surface-container-low"
          >
            <MdFileDownload size={16} aria-hidden /> Export CSV
          </button>
        </div>
        {wip.length === 0
          ? <EmptyState />
          : <SortableTable columns={columns} rows={wip} rowKey={(r) => r.item.key} initialSort={{ id: 'age', desc: true }} />}
      </section>
    </>
  )
}

