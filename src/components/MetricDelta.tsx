import { improvement, CATALOGUE, type MetricId } from '../metrics/catalogue'
import { DeltaChip } from './DeltaChip'

const sign = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '')

/** Change text in the metric's own unit: percentage points for ratios, otherwise the plain difference. */
export function deltaText(id: MetricId, current: number, previous: number): { delta: number; text: string } {
  const delta = current - previous
  const unit = CATALOGUE[id].unit
  const scaled = unit === '%' ? Math.abs(delta) * 100 : Math.abs(delta)
  const digits = unit === 'days' || unit === '/5' || unit === '/wk' ? 1 : 0
  const shown = scaled.toFixed(digits)
  const suffix = unit === '%' ? ' pp' : unit === 'days' ? 'd' : ''
  return { delta, text: `${Number(shown) === 0 ? '' : sign(delta)}${shown}${suffix}` }
}

export function MetricDelta({ id, current, previous }: { id: MetricId; current: number | null; previous: number | null }) {
  if (current === null || previous === null) return <DeltaChip delta={null} improvement={null} text="" />
  const { delta, text } = deltaText(id, current, previous)
  return <DeltaChip delta={delta} improvement={improvement(id, current, previous)} text={text} />
}
