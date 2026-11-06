import { useState } from 'react'
import { Legend, type LegendItem } from './Legend'
import { Tooltip, type TooltipData } from './Tooltip'
import { XLabels, YAxis } from './Axes'
import { linear, niceTicks, PAD, SERIES_COLOURS } from './scale'
import { useWidth } from './useWidth'

export interface BarSeries { name: string; values: (number | null)[] }

export interface BarChartProps {
  labels: string[]
  series: BarSeries[]
  reference?: { value: number; label: string }
  /** Extra tooltip rows per category index. */
  extraRows?: (i: number) => { label: string; value: string }[]
  /** One colour per series; defaults to the series palette. */
  colours?: string[]
  height?: number
  format?: (v: number) => string
}

export function BarChart({ labels, series, reference, extraRows, colours = SERIES_COLOURS, height = 240, format = String }: BarChartProps) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [tip, setTip] = useState<TooltipData | null>(null)
  const all = series.flatMap((s) => s.values).filter((v): v is number => v !== null)
  if (reference) all.push(reference.value)
  const ticks = niceTicks(0, Math.max(...(all.length ? all : [1])))
  const y = linear(ticks[0], ticks[ticks.length - 1], height - PAD.bottom, PAD.top)
  const band = (width - PAD.left - PAD.right) / Math.max(1, labels.length)
  const cx = (i: number) => PAD.left + band * (i + 0.5)
  const barW = Math.max(2, Math.min(40, (band * 0.7) / series.length))
  const legend: LegendItem[] = series.map((s, i) => ({ label: s.name, colour: colours[i % colours.length] }))
  if (reference) legend.push({ label: reference.label, colour: 'var(--color-outline)', dashed: true })

  return (
    <div>
      <div ref={ref} className="relative w-full">
        <svg width={width} height={height} onMouseLeave={() => setTip(null)} role="img" aria-label="Bar chart">
          <YAxis ticks={ticks} y={y} width={width} format={format} />
          <XLabels labels={labels} x={cx} height={height} width={width} />
          {labels.map((l, i) => (
            <g
              key={l + i}
              onMouseEnter={() =>
                setTip({
                  x: cx(i), y: PAD.top, title: l,
                  rows: [
                    ...series.map((s, k) => ({ label: s.name, colour: colours[k % colours.length], value: s.values[i] === null ? '—' : format(s.values[i]!) })),
                    ...(extraRows?.(i) ?? []),
                  ],
                })
              }
            >
              <rect x={cx(i) - band / 2} y={PAD.top} width={band} height={height - PAD.top - PAD.bottom} fill="transparent" />
              {series.map((s, k) => {
                const v = s.values[i]
                if (v === null) return null
                const x0 = cx(i) - (barW * series.length) / 2 + k * barW
                const top = y(v)
                const h = Math.max(0, y(ticks[0]) - top)
                const r = Math.min(4, barW / 2, h)
                return (
                  <path
                    key={s.name}
                    fill={colours[k % colours.length]}
                    d={`M${x0},${top + h} V${top + r} Q${x0},${top} ${x0 + r},${top} H${x0 + barW - r} Q${x0 + barW},${top} ${x0 + barW},${top + r} V${top + h} Z`}
                  />
                )
              })}
            </g>
          ))}
          {reference && <line x1={PAD.left} x2={width - PAD.right} y1={y(reference.value)} y2={y(reference.value)} stroke="var(--color-outline)" strokeDasharray="4 3" />}
        </svg>
        <Tooltip data={tip} width={width} />
      </div>
      {(series.length >= 2 || reference) && <Legend items={legend} />}
    </div>
  )
}
