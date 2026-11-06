import { useMemo, useState } from 'react'
import { EmptyState } from '../../components/EmptyState'
import { PageHeader } from '../../components/PageHeader'
import { SegmentedToggle } from '../../components/SegmentedToggle'
import { SortableTable } from '../../components/SortableTable'
import { useScoped } from '../../filters/FilterContext'
import { teamMatrixColumns } from '../overview/Overview'
import { teamRows } from '../overview/teamRows'

type TypeFilter = 'all' | 'scrum' | 'kanban'

export function Teams() {
  const view = useScoped()
  const [type, setType] = useState<TypeFilter>('all')
  const rows = useMemo(() => (view ? teamRows(view.dataset, view.squadIds, view.period) : []), [view])
  if (!view) return null
  const shown = type === 'all' ? rows : rows.filter((r) => r.squad.teamType === type)
  return (
    <>
      <PageHeader title="Teams" />
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-title-lg text-on-surface">All teams</h2>
        <SegmentedToggle
          label="Team type" value={type} onChange={setType}
          options={[{ value: 'all', label: 'All' }, { value: 'scrum', label: 'Scrum' }, { value: 'kanban', label: 'Kanban' }]}
        />
      </div>
      {shown.length === 0 ? (
        <EmptyState />
      ) : (
        <SortableTable
          columns={teamMatrixColumns} rows={shown} rowKey={(r) => r.squad.id}
          initialSort={{ id: 'signal' }}
          onRowClick={(r) => { window.location.hash = `/teams/${r.squad.id}` }}
        />
      )}
    </>
  )
}
