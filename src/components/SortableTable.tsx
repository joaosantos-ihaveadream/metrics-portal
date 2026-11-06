import { useMemo, useState, type ReactNode } from 'react'
import { MdArrowDownward, MdArrowUpward } from 'react-icons/md'

export interface Column<T> {
  id: string
  header: string
  /** Header tooltip explaining the column. */
  tooltip?: string
  render: (row: T) => ReactNode
  /** Sort value; omit to make the column unsortable. Null sorts last. */
  sortValue?: (row: T) => number | string | null
  align?: 'left' | 'right'
}

export function SortableTable<T>({
  columns, rows, rowKey, initialSort, onRowClick,
}: { columns: Column<T>[]; rows: T[]; rowKey: (r: T) => string; initialSort?: { id: string; desc?: boolean }; onRowClick?: (r: T) => void }) {
  const [sort, setSort] = useState(initialSort ?? null)
  const sorted = useMemo(() => {
    const col = columns.find((c) => c.id === sort?.id)
    if (!col?.sortValue || !sort) return rows
    const get = col.sortValue
    const dir = sort.desc ? -1 : 1
    return [...rows].sort((a, b) => {
      const x = get(a), y = get(b)
      if (x === null && y === null) return 0
      if (x === null) return 1
      if (y === null) return -1
      return (typeof x === 'string' ? x.localeCompare(String(y)) : x - (y as number)) * dir
    })
  }, [rows, columns, sort])

  return (
    <div className="overflow-x-auto rounded-card border border-outline-variant bg-surface-container-lowest">
      <table className="w-full text-body-sm">
        <thead className="border-b border-outline-variant bg-surface-container-low text-label-md uppercase text-on-surface-variant">
          <tr>
            {columns.map((c) => {
              const active = sort?.id === c.id
              return (
                <th
                  key={c.id}
                  scope="col"
                  title={c.tooltip}
                  aria-sort={active ? (sort!.desc ? 'descending' : 'ascending') : undefined}
                  className={`px-4 py-3 font-semibold ${c.align === 'right' ? 'text-right' : 'text-left'}`}
                >
                  {c.sortValue ? (
                    <button
                      type="button"
                      onClick={() => setSort(active ? { id: c.id, desc: !sort!.desc } : { id: c.id })}
                      className="inline-flex items-center gap-1 uppercase"
                    >
                      {c.header}
                      {active && (sort!.desc ? <MdArrowDownward size={14} aria-hidden /> : <MdArrowUpward size={14} aria-hidden />)}
                    </button>
                  ) : c.header}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr
              key={rowKey(r)}
              onClick={onRowClick && (() => onRowClick(r))}
              className={['border-b border-surface-container last:border-0 hover:bg-surface-container-low', onRowClick ? 'cursor-pointer' : ''].join(' ')}
            >
              {columns.map((c) => (
                <td key={c.id} className={`px-4 py-3 ${c.align === 'right' ? 'text-right' : ''}`}>{c.render(r)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
