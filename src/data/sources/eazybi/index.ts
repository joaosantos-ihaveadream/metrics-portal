import type { Dataset } from '../../model'
import type { DataSource } from '../types'

function isDataset(v: unknown): v is Dataset {
  const d = v as Dataset
  return !!d && typeof d.asOf === 'string' && Array.isArray(d.squads) && Array.isArray(d.workItems) && Array.isArray(d.sprints)
}

/** `VITE_SNAPSHOT_URL`, or `data/snapshot.json` under the app's base path when unset. */
export function snapshotUrl(url: unknown = import.meta.env.VITE_SNAPSHOT_URL, base: string = import.meta.env.BASE_URL): string {
  return typeof url === 'string' && url.trim() ? url.trim() : `${base}data/snapshot.json`
}

/** Loads the snapshot written by `npm run snapshot`. */
export const eazybiSource: DataSource = {
  id: 'eazybi',
  label: 'eazyBI snapshot',
  load: async () => {
    const res = await fetch(snapshotUrl())
    if (!res.ok) throw new Error(`Could not load the snapshot (${res.status}). Run npm run snapshot first.`)
    const data: unknown = await res.json().catch(() => null)
    if (!isDataset(data)) throw new Error('The snapshot could not be read as a dataset. Check the file and the snapshot URL.')
    return data
  },
}
