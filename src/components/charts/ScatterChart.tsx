import { useState } from 'react'
import { dayMonth } from '../../metrics/periods'
import { Legend } from './Legend'
import { Tooltip, type TooltipData } from './Tooltip'
import { YAxis } from './Axes'
import { linear, niceTicks, PAD } from './scale'
import { useWidth } from './useWidth'

export interface ScatterPoint { date: number; value: number; label: string }
export interface ReferenceLine { value: number; label: string }

export interface ScatterChartProps {
  points: ScatterPoint[]
  /** x-axis range in ms, normally the window. */
  domain: [number, number]
  references?: ReferenceLine[]
  height?: number
  format?: (v: number) => string
}

export function ScatterChart({ points, domain, references = [], height = 240, format = String }: ScatterChartProps) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [tip, setTip] = useState<TooltipData | null>(null)
  const vals = [...points.map((p) => p.value), ...references.map((r) => r.value)]
  const ticks = niceTicks(0, Math.max(...(vals.length ? vals : [1])))
  const y = linear(ticks[0], ticks[ticks.length - 1], height - PAD.bottom, PAD.top)
  const x = linear(domain[0], domain[1], PAD.left, width - PAD.right)
  const xTicks = Array.from({ length: 5 }, (_, i) => domain[0] + ((domain[1] - domain[0]) * i) / 4)
  return (
    <div>
      <div ref={ref} className="relative w-full">
        <svg width={width} height={height} onMouseLeave={() => setTip(null)} role="img" aria-label="Scatter chart">
          <YAxis ticks={ticks} y={y} width={width} format={format} />
          {xTicks.map((t) => (
            <text key={t} x={x(t)} y={height - 8} textAnchor="middle" fontSize={11} fill="var(--color-chart-axis)">{dayMonth(t)}</text>
          ))}
          {references.map((r) => (
            <line key={r.label} x1={PAD.left} x2={width - PAD.right} y1={y(r.value)} y2={y(r.value)} stroke="var(--color-outline)" strokeDasharray="4 3" />
          ))}
          {points.map((p, i) => (
            <circle
              key={i} cx={x(p.date)} cy={y(p.value)} r={4} fill="var(--color-series-1)" fillOpacity={0.6}
              onMouseEnter={() => setTip({ x: x(p.date), y: y(p.value), title: p.label, rows: [{ label: dayMonth(p.date), value: format(p.value) }] })}
            />
          ))}
        </svg>
        <Tooltip data={tip} width={width} />
      </div>
      {references.length > 0 && <Legend items={references.map((r) => ({ label: r.label, colour: 'var(--color-outline)', dashed: true }))} />}
    </div>
  )
}
