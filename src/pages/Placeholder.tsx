import { PageHeader } from '../components/PageHeader'

/** Empty page used until the real page is built in a later step. */
export function Placeholder({ title, note }: { title: string; note?: string }) {
  return (
    <>
      <PageHeader title={title} subtitle="Global Platforms" />
      <div className="rounded-card border border-outline-variant bg-surface-container-lowest p-6 text-body-sm text-on-surface-variant">
        {note ?? 'This page is built in a later step.'}
      </div>
    </>
  )
}
