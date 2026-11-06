export interface LegendItem { label: string; colour: string; dashed?: boolean }

export function Legend({ items }: { items: LegendItem[] }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-label-md text-chart-text">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <svg width={16} height={4} aria-hidden>
            <line x1={0} x2={16} y1={2} y2={2} stroke={i.colour} strokeWidth={2} strokeDasharray={i.dashed ? '4 3' : undefined} />
          </svg>
          {i.label}
        </li>
      ))}
    </ul>
  )
}
