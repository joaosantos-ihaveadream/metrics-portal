import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App'
import { DataProvider } from './data/DataContext'
import { FilterProvider } from './filters/FilterContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DataProvider>
      <FilterProvider>
        <App />
      </FilterProvider>
    </DataProvider>
  </StrictMode>,
)
