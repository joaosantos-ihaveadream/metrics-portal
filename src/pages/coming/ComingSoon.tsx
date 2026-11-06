import { PageHeader } from '../../components/PageHeader'

const PAGES: Record<string, { maturity: string; metrics: string[] }> = {
  engineering: {
    maturity: 'Not tracked yet',
    metrics: ['Deployment frequency', 'Lead time for changes', 'Change failure rate', 'Failed deployment recovery time', 'PR review time'],
  },
  'service-ops': {
    maturity: 'Scattered across tools',
    metrics: ['Incident volume by severity', 'MTTA / MTTR', 'SLO attainment', 'Toil share'],
  },
  'risk-security': {
    maturity: 'To be scoped',
    metrics: ['Vulnerability age by severity', 'Overdue security actions', 'Audit findings open'],
  },
  finance: {
    maturity: 'No metrics yet',
    metrics: ['Capitalisable vs operational effort', 'Spend by initiative', 'Cost per value stream'],
  },
}

export function ComingSoon({ id, title }: { id: string; title: string }) {
  const page = PAGES[id]
  return (
    <>
      <PageHeader title={title} />
      {page && (
        <div className="rounded-card border border-outline-variant bg-surface-container-lowest p-6">
          <p className="text-body-sm text-on-surface-variant">Current maturity</p>
          <p className="text-title-lg text-on-surface">{page.maturity}</p>
          <h2 className="mt-4 text-body-md font-semibold text-on-surface">Candidate metrics</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-body-sm text-on-surface">
            {page.metrics.map((m) => <li key={m}>{m}</li>)}
          </ul>
          <p className="mt-4 text-body-sm text-on-surface-variant">Coming soon. These are candidates, not commitments: tell us which would help your teams.</p>
        </div>
      )}
    </>
  )
}
