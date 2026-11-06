export interface TooltipData { x: number; y: number; title: string; rows: { label: string; value: string; colour?: string }[] }

/** Absolutely positioned inside a `relative` chart wrapper. */
export function Tooltip({ data, width }: { data: TooltipData | null; width: number }) {
  if (!data) return null
  const flip = data.x > width / 2
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 rounded-control border border-outline-variant bg-white px-2.5 py-1.5 text-label-md text-on-surface"
      style={{ top: Math.max(0, data.y - 8), left: data.x, transform: `translate(${flip ? 'calc(-100% - 10px)' : '10px'}, 0)` }}
    >
      <div className="font-semibold">{data.title}</div>
      {data.rows.map((r) => (
        <div key={r.label} className="flex items-center gap-1.5">
          {r.colour && <span className="inline-block h-2 w-2 rounded-full" style={{ background: r.colour }} />}
          <span className="text-on-surface-variant">{r.label}</span>
          <span className="ml-auto pl-3">{r.value}</span>
        </div>
      ))}
    </div>
  )
}
