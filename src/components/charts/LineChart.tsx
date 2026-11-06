import { useState } from 'react'
import { Legend, type LegendItem } from './Legend'
import { Tooltip, type TooltipData } from './Tooltip'
import { XLabels, YAxis } from './Axes'
import { linear, niceTicks, PAD, SERIES_COLOURS } from './scale'
import { useWidth } from './useWidth'

export interface LineSeries { name: string; values: (number | null)[] }

export interface LineChartProps {
  labels: string[]
  series: LineSeries[]
  target?: { value: number; label: string }
  area?: boolean
  height?: number
  format?: (v: number) => string
}

export function LineChart({ labels, series, target, area, height = 240, format = String }: LineChartProps) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [tip, setTip] = useState<TooltipData | null>(null)
  const all = series.flatMap((s) => s.values).filter((v): v is number => v !== null)
  if (target) all.push(target.value)
  const ticks = niceTicks(Math.min(0, ...all), Math.max(...(all.length ? all : [1])))
  const y = linear(ticks[0], ticks[ticks.length - 1], height - PAD.bottom, PAD.top)
  const x = linear(0, Math.max(1, labels.length - 1), PAD.left, width - PAD.right)
  const legend: LegendItem[] = series.map((s, i) => ({ label: s.name, colour: SERIES_COLOURS[i % 4] }))
  if (target) legend.push({ label: target.label, colour: 'var(--color-outline)', dashed: true })

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    const mx = e.clientX - box.left
    const i = Math.min(labels.length - 1, Math.max(0, Math.round(((mx - PAD.left) / (width - PAD.left - PAD.right)) * (labels.length - 1))))
    setTip({
      x: x(i), y: PAD.top, title: labels[i],
      rows: series.map((s, k) => ({ label: s.name, colour: SERIES_COLOURS[k % 4], value: s.values[i] === null ? '—' : format(s.values[i]!) })),
    })
  }

  return (
    <div>
      <div ref={ref} className="relative w-full">
        <svg width={width} height={height} onMouseMove={onMove} onMouseLeave={() => setTip(null)} role="img" aria-label="Line chart">
          <YAxis ticks={ticks} y={y} width={width} format={format} />
          <XLabels labels={labels} x={x} height={height} width={width} />
          {target && <line x1={PAD.left} x2={width - PAD.right} y1={y(target.value)} y2={y(target.value)} stroke="var(--color-outline)" strokeDasharray="4 3" />}
          {series.map((s, k) => {
            const pts = s.values.map((v, i) => (v === null ? null : `${x(i)},${y(v)}`)).filter(Boolean) as string[]
            if (!pts.length) return null
            const colour = SERIES_COLOURS[k % 4]
            return (
              <g key={s.name}>
                {area && pts.length > 1 && (
                  <polygon points={`${pts[0].split(',')[0]},${y(ticks[0])} ${pts.join(' ')} ${pts[pts.length - 1].split(',')[0]},${y(ticks[0])}`} fill={colour} opacity={0.1} />
                )}
                <polyline points={pts.join(' ')} fill="none" stroke={colour} strokeWidth={2} strokeLinejoin="round" />
              </g>
            )
          })}
          {tip && <line x1={tip.x} x2={tip.x} y1={PAD.top} y2={height - PAD.bottom} stroke="var(--color-chart-grid)" />}
        </svg>
        <Tooltip data={tip} width={width} />
      </div>
      {(series.length >= 2 || target) && <Legend items={legend} />}
    </div>
  )
}
