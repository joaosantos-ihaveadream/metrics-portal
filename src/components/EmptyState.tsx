export function EmptyState({ message = 'No teams in this scope' }: { message?: string }) {
  return (
    <div className="rounded-card border border-outline-variant bg-surface-container-lowest p-8 text-center text-body-sm text-on-surface-variant">
      {message}
    </div>
  )
}
