/** Round-number ticks (about `count`) covering [min, max]. */
export function niceTicks(min: number, max: number, count = 4): number[] {
  if (max === min) max = min + 1
  const raw = (max - min) / count
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag
  const start = Math.floor(min / step) * step
  const ticks: number[] = []
  for (let v = start; v <= max + step * 0.999; v += step) ticks.push(Math.round(v * 1e6) / 1e6)
  return ticks
}

export const linear = (d0: number, d1: number, r0: number, r1: number) => (v: number) =>
  d1 === d0 ? (r0 + r1) / 2 : r0 + ((v - d0) / (d1 - d0)) * (r1 - r0)

export const SERIES_COLOURS = ['var(--color-series-1)', 'var(--color-series-2)', 'var(--color-series-3)', 'var(--color-series-4)']
export const PAD = { top: 12, right: 16, bottom: 28, left: 44 }
