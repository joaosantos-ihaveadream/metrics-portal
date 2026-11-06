import { useState } from 'react'
import { MdExpandMore, MdHelpOutline, MdMenu, MdSearch } from 'react-icons/md'
import { useDataset } from '../data/DataContext'
import { useFilters, useScoped } from '../filters/FilterContext'
import { parseScope, scopeGroups, scopeKey } from '../filters/scope'
import { PERIODS } from '../metrics/periods'
import { href } from '../router/hashRouter'
import { SegmentedToggle } from './SegmentedToggle'

export function TopBar({ onOpenDrawer }: { onOpenDrawer: () => void }) {
  const dataset = useDataset()
  const view = useScoped()
  const { setScope, period, setPeriod } = useFilters()
  const [query, setQuery] = useState('')

  const jump = (text: string) => {
    setQuery(text)
    const team = dataset?.squads.find((s) => s.name.toLowerCase() === text.trim().toLowerCase())
    if (team) {
      setQuery('')
      window.location.hash = href(`/teams/${team.id}`)
    }
  }

  return (
    <div className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-outline-variant bg-white/80 px-4 backdrop-blur md:px-8">
      <button type="button" onClick={onOpenDrawer} className="rounded-control p-2 hover:bg-surface-container-low md:hidden" aria-label="Open menu">
        <MdMenu size={22} />
      </button>

      <label className="relative hidden w-64 sm:block">
        <MdSearch size={18} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-outline" aria-hidden />
        <input
          type="search"
          list="team-names"
          value={query}
          onChange={(e) => jump(e.target.value)}
          placeholder="Jump to team…"
          aria-label="Jump to team"
          className="h-9 w-full rounded-control border border-outline-variant bg-surface-container-lowest pl-9 pr-3 text-body-sm placeholder:text-outline"
        />
        <datalist id="team-names">
          {dataset?.squads.map((s) => <option key={s.id} value={s.name} />)}
        </datalist>
      </label>

      <div className="ml-auto flex items-center gap-3">
        <label className="hidden items-center gap-2 text-body-sm text-on-surface-variant lg:flex">
          Viewing
          <span className="relative inline-block max-w-[220px]">
            <select
              value={view ? scopeKey(view.scope) : 'all'}
              onChange={(e) => setScope(parseScope(e.target.value))}
              className="w-full max-w-[220px] appearance-none rounded-control border border-outline-variant bg-white py-2 pl-3 pr-8 text-body-sm font-medium text-on-surface"
            >
              <option value="all">All Areas</option>
              {dataset && scopeGroups(dataset).map((g) => (
                <optgroup key={g.kind} label={g.label}>
                  {g.options.map((o) => <option key={o.id} value={`${g.kind}:${o.id}`}>{o.name}</option>)}
                </optgroup>
              ))}
            </select>
            <MdExpandMore size={20} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-outline" aria-hidden />
          </span>
        </label>

        <SegmentedToggle
          label="Period"
          value={String(period) as `${(typeof PERIODS)[number]}`}
          options={PERIODS.map((p) => ({ value: String(p) as `${typeof p}`, label: `${p}d` }))}
          onChange={(v) => setPeriod(Number(v) as (typeof PERIODS)[number])}
        />

        <a href={href('/metrics')} className="rounded-control p-2 text-outline hover:bg-surface-container-low" aria-label="Metric catalogue help">
          <MdHelpOutline size={22} />
        </a>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary-fixed text-label-md text-primary" title="Signed in (demo)" aria-label="Signed in (demo)">
          JA
        </div>
      </div>
    </div>
  )
}
