import { linear } from './scale'

/** Decorative 96 × 32 trend line. Gaps (null) are skipped. */
export function Sparkline({ values, width = 96, height = 32 }: { values: (number | null)[]; width?: number; height?: number }) {
  const pts = values.map((v, i) => (v === null ? null : ([i, v] as const))).filter((p): p is readonly [number, number] => p !== null)
  if (pts.length < 2) return <svg width={width} height={height} aria-hidden />
  const ys = pts.map((p) => p[1])
  const x = linear(0, values.length - 1, 2, width - 2)
  const y = linear(Math.min(...ys), Math.max(...ys), height - 3, 3)
  return (
    <svg width={width} height={height} aria-hidden className="shrink-0">
      <polyline fill="none" stroke="var(--color-series-1)" strokeWidth={2} strokeLinejoin="round" points={pts.map(([i, v]) => `${x(i)},${y(v)}`).join(' ')} />
    </svg>
  )
}
