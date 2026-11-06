/** Small deterministic random number generator (mulberry32) with helpers. */
export interface Rng {
  next(): number
  between(min: number, max: number): number
  int(min: number, max: number): number
  pick<T>(list: readonly T[]): T
  chance(p: number): boolean
  normal(): number
  logNormal(median: number, sigma: number): number
  poisson(rate: number): number
}

export function createRng(seed: number): Rng {
  let a = seed >>> 0
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const normal = () => {
    const u = next() || Number.MIN_VALUE
    const v = next()
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
  }
  return {
    next,
    between: (min, max) => min + (max - min) * next(),
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: (list) => list[Math.floor(next() * list.length)],
    chance: (p) => next() < p,
    normal,
    logNormal: (median, sigma) => Math.exp(Math.log(median) + sigma * normal()),
    poisson(rate) {
      const limit = Math.exp(-rate)
      let k = 0
      let p = 1
      do {
        k++
        p *= next()
      } while (p > limit)
      return k - 1
    },
  }
}
