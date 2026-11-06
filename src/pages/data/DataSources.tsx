import { MdArrowForward } from 'react-icons/md'
import { useDataset } from '../../data/DataContext'
import { toMs } from '../../metrics'

const ADAPTERS = [
  { name: 'Dummy data', status: 'Live in POC', note: 'Seeded, generated in the browser.' },
  { name: 'eazyBI snapshot', status: 'Next', note: 'Exports converted to the canonical snapshot.' },
  { name: 'Jira changelog (direct)', status: 'Later', note: 'Read straight from Jira once eazyBI is retired.' },
]
const PIPELINE = ['eazyBI / Jira', 'Extraction', 'Canonical snapshot', 'Portal']

const fullDate = (iso: string) =>
  new Date(toMs(iso)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

export function DataSources() {
  const dataset = useDataset()
  if (!dataset) return null
  const card = 'rounded-card border border-outline-variant bg-surface-container-lowest p-5'
  return (
    <>
      <header className="mb-8">
        <h1 className="text-headline-md text-on-surface">Data sources</h1>
        <p className="mt-1 text-body-sm text-on-surface-variant">Where the numbers come from, and where they are heading.</p>
      </header>

      <section aria-label="Active source" className={card}>
        <h2 className="text-title-lg text-on-surface">Active source</h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-3">
          <div><dt className="text-label-sm uppercase text-outline">Source</dt><dd className="text-body-md font-semibold">{dataset.source.label}</dd></div>
          <div><dt className="text-label-sm uppercase text-outline">Snapshot date</dt><dd className="text-body-md font-semibold">{fullDate(dataset.asOf)}</dd></div>
          <div><dt className="text-label-sm uppercase text-outline">Dummy data</dt><dd className="text-body-md font-semibold">{dataset.source.isDummy ? 'Yes' : 'No'}</dd></div>
        </dl>
      </section>

      <section aria-label="Adapters" className="mt-6">
        <h2 className="mb-3 text-title-lg text-on-surface">Adapters</h2>
        <ul className="grid gap-4 md:grid-cols-3">
          {ADAPTERS.map((a) => (
            <li key={a.name} className={card}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-body-md font-semibold text-on-surface">{a.name}</span>
                <span className="rounded-full border border-outline-variant px-2 py-0.5 text-label-sm text-on-surface-variant">{a.status}</span>
              </div>
              <p className="mt-2 text-body-sm text-on-surface-variant">{a.note}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Target pipeline" className={`mt-6 ${card}`}>
        <h2 className="text-title-lg text-on-surface">Target pipeline</h2>
        <ol className="mt-3 flex flex-wrap items-center gap-2">
          {PIPELINE.map((step, i) => (
            <li key={step} className="flex items-center gap-2">
              <span className={['rounded-control border px-3 py-2 text-body-sm font-semibold', step === 'Extraction' ? 'border-primary text-primary' : 'border-outline-variant text-on-surface'].join(' ')}>{step}</span>
              {i < PIPELINE.length - 1 && <MdArrowForward size={18} className="text-outline" aria-hidden />}
            </li>
          ))}
        </ol>
        <p className="mt-3 text-body-sm text-on-surface-variant">Only the extraction step changes when eazyBI is retired.</p>
      </section>
    </>
  )
}
