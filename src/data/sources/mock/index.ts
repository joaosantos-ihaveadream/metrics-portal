import type { DataSource } from '../types'
import { generateMockDataset } from './generate'

export const mockSource: DataSource = {
  id: 'mock',
  label: 'Dummy data',
  load: async () => generateMockDataset(),
}
