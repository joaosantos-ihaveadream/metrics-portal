export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-8">
      <h1 className="text-headline-md text-on-surface">{title}</h1>
      {subtitle && <p className="mt-1 text-body-sm text-on-surface-variant">{subtitle}</p>}
    </header>
  )
}
