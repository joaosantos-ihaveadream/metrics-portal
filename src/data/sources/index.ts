import { eazybiSource } from './eazybi'
import { mockSource } from './mock'
import type { DataSource } from './types'

export type { DataSource } from './types'

export const SOURCES: Record<string, DataSource> = {
  mock: mockSource,
  eazybi: eazybiSource,
}

/** `VITE_DATA_SOURCE=mock|eazybi`, default mock. */
export function activeSource(): DataSource {
  const id = import.meta.env.VITE_DATA_SOURCE
  return (typeof id === 'string' && SOURCES[id]) || mockSource
}
