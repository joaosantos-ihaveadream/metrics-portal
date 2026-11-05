import type { DataSource } from '../types'

/** Placeholder until the converter and sample exports arrive (build step 8). */
export const eazybiSource: DataSource = {
  id: 'eazybi',
  label: 'eazyBI snapshot',
  load: async () => {
    throw new Error('The eazyBI source is not connected yet.')
  },
}
