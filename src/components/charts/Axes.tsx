import { PAD } from './scale'

export function YAxis({ ticks, y, width, format }: { ticks: number[]; y: (v: number) => number; width: number; format: (v: number) => string }) {
  return (
    <g>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--color-chart-grid)" />
          <text x={PAD.left - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" fontSize={11} fill="var(--color-chart-axis)">{format(t)}</text>
        </g>
      ))}
    </g>
  )
}

/** Labels thinned so they never overlap. */
export function XLabels({ labels, x, height, width }: { labels: string[]; x: (i: number) => number; height: number; width: number }) {
  const every = Math.max(1, Math.ceil(labels.length / Math.max(2, Math.floor((width - PAD.left - PAD.right) / 56))))
  return (
    <g>
      {labels.map((l, i) => i % every === 0 && (
        <text key={i} x={x(i)} y={height - 8} textAnchor="middle" fontSize={11} fill="var(--color-chart-axis)">{l}</text>
      ))}
    </g>
  )
}
