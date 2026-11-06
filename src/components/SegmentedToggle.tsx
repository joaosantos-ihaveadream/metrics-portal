interface Option<T extends string> {
  value: T
  label: string
}

export function SegmentedToggle<T extends string>({
  options, value, onChange, label,
}: { options: Option<T>[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-control border border-outline-variant bg-white p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={['rounded-[3px] px-2.5 py-1.5 text-label-md', value === o.value ? 'bg-primary-container text-white' : 'bg-white hover:bg-surface-container-low'].join(' ')}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
