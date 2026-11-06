/** Whole-number percentages that add up to exactly 100 (largest-remainder rounding). Null when there is no data. */
export function wholePercents<K extends string>(shares: Record<K, number> | null): Record<K, number> | null {
  if (!shares) return null
  const keys = Object.keys(shares) as K[]
  const raw = keys.map((k) => ({ k, v: shares[k] * 100 }))
  const out = Object.fromEntries(raw.map(({ k, v }) => [k, Math.floor(v)])) as Record<K, number>
  let left = 100 - keys.reduce((a, k) => a + out[k], 0)
  for (const { k } of [...raw].sort((a, b) => (b.v - Math.floor(b.v)) - (a.v - Math.floor(a.v)))) {
    if (left <= 0) break
    out[k]++
    left--
  }
  return out
}
