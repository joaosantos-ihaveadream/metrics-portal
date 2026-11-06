import { createRng } from '../data/random'
import { percentile } from './stats'

const HISTORY_DAYS = 84
const HORIZON_DAYS = 14
const CONFIDENCE_PERCENTILE = 15

export { HISTORY_DAYS, HORIZON_DAYS }

/** Same history always seeds the same random draws. */
function seedFrom(history: readonly number[]): number {
  let h = 2166136261
  for (const n of history) {
    h ^= n + 1
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** "At least N items" in the next 14 days with 85% confidence. All-zero history gives null. */
export function forecastItems(history: readonly number[], runs: number): number | null {
  if (!history.length || history.every((n) => n === 0)) return null
  const rng = createRng(seedFrom(history))
  const totals: number[] = []
  for (let r = 0; r < runs; r++) {
    let total = 0
    for (let d = 0; d < HORIZON_DAYS; d++) total += history[rng.int(0, history.length - 1)]
    totals.push(total)
  }
  return Math.floor(percentile(totals, CONFIDENCE_PERCENTILE) ?? 0)
}
