export const DAY_MS = 86_400_000
export const PERIODS = [30, 90, 180] as const
export type Period = (typeof PERIODS)[number]
export const DEFAULT_PERIOD: Period = 90

export interface Window {
  /** Exclusive. */
  start: number
  /** Inclusive. */
  end: number
}

export const toMs = (iso: string) => new Date(iso).getTime()

/** Inside when after the start and at or before the end. */
export const inWindow = (ms: number, w: Window) => ms > w.start && ms <= w.end

export const windowEndingAt = (end: number, days: number): Window => ({
  start: end - days * DAY_MS,
  end,
})

export const previousWindow = (w: Window): Window => ({
  start: w.start - (w.end - w.start),
  end: w.start,
})

/** 7-day buckets ending at the window end, oldest first. */
export function weekBuckets(w: Window): Window[] {
  const weeks = Math.max(1, Math.round((w.end - w.start) / (7 * DAY_MS)))
  return Array.from({ length: weeks }, (_, i) => ({
    start: w.end - (weeks - i) * 7 * DAY_MS,
    end: w.end - (weeks - i - 1) * 7 * DAY_MS,
  }))
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "2 Oct" */
export function dayMonth(ms: number): string {
  const d = new Date(ms)
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`
}
