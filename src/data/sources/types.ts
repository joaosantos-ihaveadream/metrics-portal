import type { Dataset } from '../model'

export interface DataSource {
  id: string
  label: string
  load: () => Promise<Dataset>
}
