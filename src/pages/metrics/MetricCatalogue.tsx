import { formatMetricText } from '../../components/format'
import { CATALOGUE, METRIC_IDS, type MetricDefinition } from '../../metrics'

const CATEGORY_ORDER = ['Predictability', 'Flow', 'Quality', 'Health', 'Investment', 'Forecast']
const DIRECTION = { higher: 'Higher is better', lower: 'Lower is better', neutral: 'Context' } as const

function thresholdText(m: MetricDefinition): string {
  if (!m.thresholds || m.direction === 'neutral') return 'Context'
  const { good, watch } = m.thresholds
  const [a, b] = m.direction === 'higher' ? ['≥', '≥'] : ['≤', '≤']
  return `On track ${a} ${formatMetricText(m.id, good)} · Watch ${b} ${formatMetricText(m.id, watch)} · otherwise Needs attention`
}

function Row({ label, children }: { label: string; children: string }) {
  return (
    <div>
      <dt className="text-label-sm uppercase text-outline">{label}</dt>
      <dd className="text-body-sm text-on-surface">{children}</dd>
    </div>
  )
}

export function MetricCatalogue() {
  const groups = CATEGORY_ORDER.map((c) => ({ category: c, metrics: METRIC_IDS.map((id) => CATALOGUE[id]).filter((m) => m.category === c) }))
  return (
    <>
      <header className="mb-8">
        <h1 className="text-headline-md text-on-surface">Metric catalogue</h1>
        <p className="mt-1 text-body-sm text-on-surface-variant">
          The KPI Playbook, live: every number in the portal is defined here — meaning, formula, data source and thresholds.
        </p>
      </header>
      {groups.filter((g) => g.metrics.length).map((g) => (
        <section key={g.category} aria-label={g.category} className="mb-8">
          <h2 className="mb-3 text-title-lg text-on-surface">{g.category}</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {g.metrics.map((m) => (
              <article key={m.id} className="rounded-card border border-outline-variant bg-surface-container-lowest p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-body-md font-semibold text-on-surface">{m.name}</h3>
                  {m.teamTypes.map((t) => (
                    <span key={t} className="rounded-full border border-outline-variant px-2 py-0.5 text-label-sm text-on-surface-variant">{t === 'scrum' ? 'Scrum' : 'Kanban'}</span>
                  ))}
                  <span className="ml-auto text-label-sm text-outline">{DIRECTION[m.direction]}</span>
                </div>
                <p className="mt-2 text-body-sm text-on-surface-variant">{m.description}</p>
                <dl className="mt-3 space-y-2">
                  <Row label="Formula">{m.formula}</Row>
                  <Row label="Source">{m.source}</Row>
                  <Row label="Signal thresholds">{thresholdText(m)}</Row>
                </dl>
                {m.caveat && <p className="mt-3 border-t border-surface-container pt-3 text-label-md text-on-surface-variant">{m.caveat}</p>}
              </article>
            ))}
          </div>
        </section>
      ))}
    </>
  )
}
