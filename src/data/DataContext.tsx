import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Dataset } from './model'
import { activeSource } from './sources'

type DataState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; dataset: Dataset }

const DataContext = createContext<DataState>({ status: 'loading' })

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DataState>({ status: 'loading' })
  useEffect(() => {
    let cancelled = false
    activeSource()
      .load()
      .then((dataset) => !cancelled && setState({ status: 'ready', dataset }))
      .catch((e: unknown) =>
        !cancelled && setState({ status: 'error', message: e instanceof Error ? e.message : 'Could not load the data.' }),
      )
    return () => {
      cancelled = true
    }
  }, [])
  return <DataContext.Provider value={state}>{children}</DataContext.Provider>
}

export function useDataState(): DataState {
  return useContext(DataContext)
}

/** For pages: the dataset, once the provider has loaded it. */
export function useDataset(): Dataset | null {
  const state = useDataState()
  return state.status === 'ready' ? state.dataset : null
}
