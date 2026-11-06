export const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0)

export function mean(xs: readonly number[]): number | null {
  return xs.length ? sum(xs) / xs.length : null
}

/** Percentile with linear interpolation; p in 0..100. */
export function percentile(xs: readonly number[], p: number): number | null {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const rank = (Math.min(100, Math.max(0, p)) / 100) * (s.length - 1)
  const lo = Math.floor(rank)
  const hi = Math.ceil(rank)
  return s[lo] + (s[hi] - s[lo]) * (rank - lo)
}

export const median = (xs: readonly number[]) => percentile(xs, 50)

/** Sample standard deviation (n − 1). */
export function stdev(xs: readonly number[]): number | null {
  if (xs.length < 2) return null
  const m = sum(xs) / xs.length
  return Math.sqrt(sum(xs.map((x) => (x - m) ** 2)) / (xs.length - 1))
}

/** Coefficient of variation, undefined (null) when the mean is 0. */
export function cv(xs: readonly number[]): number | null {
  const m = mean(xs)
  const s = stdev(xs)
  if (m === null || s === null || m === 0) return null
  return s / m
}
