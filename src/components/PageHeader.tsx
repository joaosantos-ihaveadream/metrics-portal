import { useFilters, useScoped } from '../filters/FilterContext'

/** Subtitle: "<scope> · <question> · last N days". An empty scope says so instead. */
export function PageHeader({ title, question }: { title: string; question?: string }) {
  const view = useScoped()
  const { period } = useFilters()
  const subtitle = !view
    ? undefined
    : view.squads.length === 0
      ? 'No teams in this scope'
      : [view.label, question, `last ${period} days`].filter(Boolean).join(' · ')
  return (
    <header className="mb-8">
      <h1 className="text-headline-md text-on-surface">{title}</h1>
      {subtitle && <p className="mt-1 text-body-sm text-on-surface-variant">{subtitle}</p>}
    </header>
  )
}
