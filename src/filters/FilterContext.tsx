import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Dataset, Squad } from '../data/model'
import { useDataset } from '../data/DataContext'
import type { Period } from '../metrics/periods'
import { ALL_SCOPE, parsePeriod, parseScope, scopeKey, scopeLabel, scopeSquads, type Scope } from './scope'

const SCOPE_KEY = 'delta-hub.scope'
const PERIOD_KEY = 'delta-hub.period'

interface Filters {
  scope: Scope
  period: Period
  setScope: (s: Scope) => void
  setPeriod: (p: Period) => void
}

const FilterContext = createContext<Filters | null>(null)

const read = (key: string): string | null => {
  try { return window.localStorage.getItem(key) } catch { return null }
}
const write = (key: string, value: string) => {
  try { window.localStorage.setItem(key, value) } catch { /* storage unavailable: filters just aren't saved */ }
}

export function FilterProvider({ children }: { children: ReactNode }) {
  const [scope, setScopeState] = useState<Scope>(() => parseScope(read(SCOPE_KEY)))
  const [period, setPeriodState] = useState<Period>(() => parsePeriod(read(PERIOD_KEY)))
  const setScope = useCallback((s: Scope) => { setScopeState(s); write(SCOPE_KEY, scopeKey(s)) }, [])
  const setPeriod = useCallback((p: Period) => { setPeriodState(p); write(PERIOD_KEY, String(p)) }, [])
  const value = useMemo(() => ({ scope, period, setScope, setPeriod }), [scope, period, setScope, setPeriod])
  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>
}

export function useFilters(): Filters {
  const ctx = useContext(FilterContext)
  if (!ctx) throw new Error('useFilters must be used inside FilterProvider')
  return ctx
}

export interface ScopedView {
  dataset: Dataset
  scope: Scope
  period: Period
  squads: Squad[]
  squadIds: string[]
  label: string
}

/** The loaded dataset narrowed to the current scope; null while loading. A saved scope that no longer matches falls back to all. */
export function useScoped(): ScopedView | null {
  const dataset = useDataset()
  const { scope: saved, period } = useFilters()
  return useMemo(() => {
    if (!dataset) return null
    let scope = saved
    let squads = scopeSquads(dataset, scope)
    if (!squads.length && scope.kind !== 'all') { scope = ALL_SCOPE; squads = scopeSquads(dataset, scope) }
    return { dataset, scope, period, squads, squadIds: squads.map((s) => s.id), label: scopeLabel(dataset, scope) }
  }, [dataset, saved, period])
}
