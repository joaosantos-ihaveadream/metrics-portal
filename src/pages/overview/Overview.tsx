import { useMemo, useRef, useState } from 'react'
import { MdFavoriteBorder, MdFileDownload, MdPieChartOutline, MdSchedule, MdSentimentSatisfied } from 'react-icons/md'
import { DeltaChip } from '../../components/DeltaChip'
import { downloadCsv } from '../../components/download'
import { EmptyState } from '../../components/EmptyState'
import { KpiTile } from '../../components/KpiTile'
import { MetricDelta } from '../../components/MetricDelta'
import { PageHeader } from '../../components/PageHeader'
import { SortableTable, type Column } from '../../components/SortableTable'
import { StatusBadge } from '../../components/StatusBadge'
import { TeamAvatar } from '../../components/TeamAvatar'
import { formatMetric, formatMetricText } from '../../components/format'
import { WORK_CATEGORIES, type WorkCategory } from '../../data/model'
import { useScoped } from '../../filters/FilterContext'
import {
  computePeriod, HEALTH_INPUTS, pulseMovers, scoreFor, signalFor, trend,
  type MetricId, type PulseMover, type Signal,
} from '../../metrics'
import { href } from '../../router/hashRouter'
import { wholePercents } from './categories'
import { SIGNAL_LABEL, teamsCsv } from './csv'
import { buildHighlights } from './highlights'
import { Highlights } from './HighlightsCarousel'
import { buildInsights } from './insights'
import { InsightsPanel } from './InsightsPanel'
import { teamRows, type TeamRow } from './teamRows'

const SIGNALS: Signal[] = ['needs-attention', 'watch', 'on-track']
const SIGNAL_ORDER: Record<Signal, number> = { 'needs-attention': 0, watch: 1, 'on-track': 2 }
const CATEGORY_BG: Record<WorkCategory, string> = {
  'OKR aligned': 'bg-series-1', 'Non-OKR aligned': 'bg-series-2', 'Keep the lights on': 'bg-series-3',
  'L&D': 'bg-series-4', None: 'bg-chart-neutral',
}
const TONE_CELL: Record<Signal, string> = {
  'on-track': 'bg-good-bg text-good', watch: 'bg-warn-bg text-warn', 'needs-attention': 'bg-bad-bg text-bad',
}
const INPUT_NAMES: Partial<Record<MetricId, string>> = {
  sayDo: 'completion ratio', cycleP85: 'cycle time (85th pct)', velocityCv: 'velocity variability',
  scopeChange: 'scope change', leadP85: 'lead time (85th pct)', pulseScore: 'pulse check',
  throughputCv: 'throughput variability',
}
const signedPp = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n)} pp`

function Cell({ id, value }: { id: MetricId; value: number | null }) {
  const s = signalFor(id, value)
  return (
    <span className={`inline-block min-w-12 rounded-control px-2 py-1 text-center font-semibold ${s ? TONE_CELL[s] : 'text-on-surface-variant'}`}>
      {formatMetricText(id, value)}
    </span>
  )
}

/** Teams counted by their own Health index band (>= 80 on track, < 50 needs attention). */
export function healthBands(rows: TeamRow[]): Record<Signal, number> {
  const out: Record<Signal, number> = { 'on-track': 0, watch: 0, 'needs-attention': 0 }
  for (const r of rows) {
    const s = signalFor('healthIndex', r.current.values.healthIndex)
    if (s) out[s]++
  }
  return out
}

export const healthFooter = (b: Record<Signal, number>, n: number) =>
  `${b['on-track']} of ${n} teams score 80+ - ${b['needs-attention']} below 50`

function MoverLine({ label, mover }: { label: string; mover: PulseMover }) {
  const up = mover.delta > 0
  return (
    <div className="flex items-center justify-between gap-2">
      <span>{label}</span>
      <span className="flex items-center gap-2">
        <DeltaChip delta={mover.delta} improvement={up ? 'better' : 'worse'} text={`${up ? '+' : '−'}${Math.abs(mover.delta).toFixed(1)}`} />
        <span className="font-semibold text-on-surface">{mover.current.toFixed(1)}/5</span>
      </span>
    </div>
  )
}

const columns: Column<TeamRow>[] = [
  {
    id: 'team', header: 'Team', sortValue: (r) => r.squad.name,
    render: (r) => (
      <div className="flex items-center gap-3">
        <TeamAvatar name={r.squad.name} />
        <div>
          <a href={href(`/teams/${r.squad.id}`)} className="font-semibold text-on-surface hover:underline">{r.squad.name}</a>
          <div className="text-label-sm text-outline">{r.domain} · {r.lead}</div>
        </div>
      </div>
    ),
  },
  {
    id: 'signal', header: 'Signal', sortValue: (r) => SIGNAL_ORDER[r.signal.signal],
    tooltip: 'Worst of the team’s signal metrics: any Needs attention, or two or more on Watch.',
    render: (r) => (
      <span
        title={r.signal.reasons.length ? `Behind this signal: ${r.signal.reasons.map((x) => formatName(x.id)).join(', ')}` : 'No metric needs a closer look.'}
      >
        <StatusBadge signal={r.signal.signal} />
      </span>
    ),
  },
  {
    id: 'health', header: 'Health index', sortValue: (r) => r.current.values.healthIndex, align: 'right',
    tooltip: 'Mean score of the team’s inputs, 0–100.',
    render: (r) => <Cell id="healthIndex" value={r.current.values.healthIndex} />,
  },
  {
    id: 'sayDo', header: 'Completion ratio', sortValue: (r) => r.current.values.sayDo, align: 'right',
    tooltip: 'Say/Do, Scrum teams only.',
    render: (r) => <Cell id="sayDo" value={r.current.values.sayDo} />,
  },
  {
    id: 'cycle', header: 'Cycle time', sortValue: (r) => r.current.values.cycleP85, align: 'right',
    tooltip: 'Cycle time, 85th percentile.',
    render: (r) => <Cell id="cycleP85" value={r.current.values.cycleP85} />,
  },
  {
    id: 'stability', header: 'Stability', align: 'right',
    tooltip: 'Velocity variability for Scrum teams, throughput variability for Kanban teams. Lower is steadier.',
    sortValue: (r) => (r.squad.teamType === 'scrum' ? r.current.values.velocityCv : r.current.values.throughputCv),
    render: (r) =>
      r.squad.teamType === 'scrum'
        ? <Cell id="velocityCv" value={r.current.values.velocityCv} />
        : <Cell id="throughputCv" value={r.current.values.throughputCv} />,
  },
  {
    id: 'scope', header: 'Scope volatility', sortValue: (r) => r.current.values.scopeChange, align: 'right',
    tooltip: 'Mid-sprint scope change, Scrum teams only.',
    render: (r) => <Cell id="scopeChange" value={r.current.values.scopeChange} />,
  },
  {
    id: 'forecast', header: 'Forecasting accuracy', sortValue: (r) => r.current.values.forecastAccuracy, align: 'right',
    tooltip: 'Share of past two-week forecasts that were met.',
    render: (r) => (
      <div>
        <Cell id="forecastAccuracy" value={r.current.values.forecastAccuracy} />
        <div className="text-label-sm text-outline">2-wk forecasts met</div>
      </div>
    ),
  },
]

function formatName(id: MetricId) {
  return INPUT_NAMES[id] ?? id
}

export function Overview() {
  const view = useScoped()
  const matrixRef = useRef<HTMLElement>(null)
  const [filter, setFilter] = useState<Signal | null>(null)

  const data = useMemo(() => {
    if (!view || !view.squadIds.length) return null
    const { dataset, squadIds, period } = view
    const { window, previousWindow, current, previous } = computePeriod(dataset, squadIds, period)
    const rows = teamRows(dataset, squadIds, period)
    return {
      current, previous, rows,
      movers: pulseMovers(dataset, new Set(squadIds), window, previousWindow),
      insights: buildInsights(rows),
      highlights: buildHighlights(dataset, rows, period),
      trends: {
        healthIndex: trend(dataset, squadIds, 'healthIndex').map((p) => p.value),
        pulseScore: trend(dataset, squadIds, 'pulseScore').map((p) => p.value),
        leadP85: trend(dataset, squadIds, 'leadP85').map((p) => p.value),
        okrShare: trend(dataset, squadIds, 'okrShare').map((p) => p.value),
      },
    }
  }, [view])

  if (!view) return null
  const scrum = view.squads.filter((s) => s.teamType === 'scrum').length
  const kanban = view.squads.length - scrum
  const header = <PageHeader title="Delivery overview" question={`${view.squads.length} ${view.squads.length === 1 ? 'team' : 'teams'} (${scrum} Scrum, ${kanban} Kanban)`} />
  if (!data) return <>{header}<EmptyState /></>

  const { current, previous, rows, movers, insights, highlights, trends } = data
  const { period } = view
  const note = `vs prev. ${period}d`
  const counts = Object.fromEntries(SIGNALS.map((s) => [s, rows.filter((r) => r.signal.signal === s).length])) as Record<Signal, number>
  const single = rows.length === 1
  const bands = healthBands(rows)

  const inputs = single
    ? HEALTH_INPUTS[rows[0].squad.teamType]
        .filter((id) => scoreFor(id, current.values[id]) !== null)
        .map(formatName)
    : []

  const cats = wholePercents(current.categories)
  const prevCats = wholePercents(previous.categories)
  const shown = filter ? rows.filter((r) => r.signal.signal === filter) : rows

  const pickFilter = (s: Signal) => {
    setFilter((f) => (f === s ? null : s))
    matrixRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      {header}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          label="Health index" icon={MdFavoriteBorder} href={href('/health')}
          description="Overall picture of delivery and team health, built from scored inputs."
          {...formatMetric('healthIndex', current.values.healthIndex)}
          trend={trends.healthIndex}
          delta={<MetricDelta id="healthIndex" current={current.values.healthIndex} previous={previous.values.healthIndex} />}
          deltaNote={note} signal={signalFor('healthIndex', current.values.healthIndex)}
          footer={single
            ? `Built from ${inputs.length ? inputs.join(', ') : 'no scored inputs yet'}`
            : healthFooter(bands, rows.length)}
        />
        <KpiTile
          label="Pulse check" icon={MdSentimentSatisfied}
          description="How teams say they feel about their work."
          {...formatMetric('pulseScore', current.values.pulseScore)}
          trend={trends.pulseScore}
          delta={<MetricDelta id="pulseScore" current={current.values.pulseScore} previous={previous.values.pulseScore} />}
          deltaNote={note} signal={signalFor('pulseScore', current.values.pulseScore)}
          footer={
            <div className="space-y-1">
              {movers.rise && <MoverLine label={movers.rise.dimension} mover={movers.rise} />}
              {movers.fall && <MoverLine label={movers.fall.dimension} mover={movers.fall} />}
              <div className="text-label-sm text-outline">Biggest rise and fall by dimension · change vs prev. {period}d</div>
            </div>
          }
        />
        <KpiTile
          label="Lead time (85th pct)" icon={MdSchedule}
          description="Time from request to done for 85% of items."
          {...formatMetric('leadP85', current.values.leadP85)}
          trend={trends.leadP85}
          delta={<MetricDelta id="leadP85" current={current.values.leadP85} previous={previous.values.leadP85} />}
          deltaNote={note} signal={signalFor('leadP85', current.values.leadP85)}
          footer={`Of which in progress (cycle time, 85th pct): ${formatMetricText('cycleP85', current.values.cycleP85)}`}
        />
        <KpiTile
          label="Development categories" icon={MdPieChartOutline}
          description="Where finished work went. The headline is the OKR-aligned share."
          value={cats ? String(cats['OKR aligned']) : '—'} unit={cats ? '% OKR aligned' : undefined}
          trend={trends.okrShare}
          delta={<MetricDelta id="okrShare" current={current.values.okrShare} previous={previous.values.okrShare} />}
          deltaNote={note}
          footer={cats && (
            <div>
              <div className="flex h-2 overflow-hidden rounded-full" role="img" aria-label="Share of items finished by category">
                {WORK_CATEGORIES.map((c) => <span key={c} className={CATEGORY_BG[c]} style={{ width: `${cats[c]}%` }} />)}
              </div>
              <ul className="mt-2 space-y-1">
                {WORK_CATEGORIES.map((c) => (
                  <li key={c} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${CATEGORY_BG[c]}`} aria-hidden />{c}
                    </span>
                    <span className="flex items-center gap-2">
                      {prevCats && <DeltaChip delta={cats[c] - prevCats[c]} improvement={null} text={signedPp(cats[c] - prevCats[c])} />}
                      <span className="w-9 text-right font-semibold text-on-surface">{cats[c]}%</span>
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-2 text-label-sm text-outline">Share of items finished · change vs prev. {period}d</div>
            </div>
          )}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Highlights items={highlights} />
        <section aria-label="Signals at a glance" className="rounded-card border border-outline-variant bg-surface-container-lowest p-5">
          <h2 className="text-title-lg text-on-surface">Signals at a glance</h2>
          <ul className="mt-3 space-y-2">
            {SIGNALS.map((s) => (
              <li key={s}>
                <button
                  type="button" aria-pressed={filter === s} onClick={() => pickFilter(s)}
                  className={['flex w-full items-center justify-between rounded-control border px-3 py-2 hover:bg-surface-container-low', filter === s ? 'border-primary' : 'border-outline-variant'].join(' ')}
                >
                  <StatusBadge signal={s} />
                  <span className="text-title-lg text-on-surface">{counts[s]}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-label-md text-on-surface-variant">
            Signals are traced to metrics. See the <a className="font-semibold text-primary hover:underline" href={href('/metrics')}>Metric catalogue</a>.
          </p>
        </section>
      </div>

      {!single && (
        <section ref={matrixRef} aria-label="Team health matrix" className="mt-8 scroll-mt-20">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-title-lg text-on-surface">
              Team health matrix
              {filter && <span className="ml-2 text-body-sm font-normal text-on-surface-variant">{SIGNAL_LABEL[filter]} only · <button type="button" className="font-semibold text-primary hover:underline" onClick={() => setFilter(null)}>show all</button></span>}
            </h2>
            <button
              type="button" onClick={() => downloadCsv('team-health-matrix.csv', teamsCsv(shown))}
              className="inline-flex items-center gap-1 rounded-control border border-outline-variant bg-white px-3 py-1.5 text-label-md hover:bg-surface-container-low"
            >
              <MdFileDownload size={16} aria-hidden /> Export CSV
            </button>
          </div>
          <SortableTable
            columns={columns} rows={shown} rowKey={(r) => r.squad.id}
            initialSort={{ id: 'signal' }}
            onRowClick={(r) => { window.location.hash = `/teams/${r.squad.id}` }}
          />
        </section>
      )}

      <div className="mt-8">
        <InsightsPanel insights={insights} />
      </div>
    </>
  )
}
