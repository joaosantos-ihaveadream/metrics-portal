import { CATALOGUE, type MetricId } from '../metrics/catalogue'

export interface Formatted {
  value: string
  unit: string
}

/** Display value and unit for a metric. Ratios are stored as fractions. */
export function formatMetric(id: MetricId, v: number | null): Formatted {
  const { unit } = CATALOGUE[id]
  if (v === null) return { value: '—', unit: '' }
  switch (unit) {
    case '%': return { value: String(Math.round(v * 100)), unit: '%' }
    case 'days': return { value: v.toFixed(1), unit: 'd' }
    case '/wk': return { value: v.toFixed(1), unit: '/wk' }
    case '/5': return { value: v.toFixed(1), unit: '/5' }
    case '0–100': return { value: String(Math.round(v)), unit: '/100' }
    case 'count': return { value: String(Math.round(v)), unit: '' }
    default: return { value: String(Math.round(v)), unit: unit === 'pts' ? ' pts' : ` ${unit}` }
  }
}

export const formatMetricText = (id: MetricId, v: number | null): string => {
  const f = formatMetric(id, v)
  return `${f.value}${f.unit}`
}
