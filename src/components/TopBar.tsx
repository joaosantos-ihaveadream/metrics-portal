import { useState } from 'react'
import { MdHelpOutline, MdMenu, MdSearch } from 'react-icons/md'
import { href } from '../router/hashRouter'

const periods = ['30d', '90d', '180d'] as const

/** Static shell version: scope and period are wired up (and saved) in step 4. */
export function TopBar({ onOpenDrawer }: { onOpenDrawer: () => void }) {
  const [period, setPeriod] = useState<(typeof periods)[number]>('90d')
  return (
    <div className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-outline-variant bg-white/80 px-4 backdrop-blur md:px-8">
      <button type="button" onClick={onOpenDrawer} className="rounded-control p-2 hover:bg-surface-container-low md:hidden" aria-label="Open menu">
        <MdMenu size={22} />
      </button>

      <label className="relative hidden w-64 sm:block">
        <MdSearch size={18} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-outline" aria-hidden />
        <input
          type="search"
          placeholder="Jump to team…"
          className="h-9 w-full rounded-control border border-outline-variant bg-surface-container-lowest pl-9 pr-3 text-body-sm placeholder:text-outline"
        />
      </label>

      <div className="ml-auto flex items-center gap-3">
        <label className="hidden items-center gap-2 text-body-sm text-on-surface-variant lg:flex">
          Viewing
          <select className="h-9 rounded-control border border-outline-variant bg-surface-container-lowest px-2 text-body-sm text-on-surface">
            <option>All Areas</option>
          </select>
        </label>

        <div role="group" aria-label="Period" className="flex overflow-hidden rounded-control border border-outline-variant">
          {periods.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              aria-pressed={period === p}
              className={['h-9 px-3 text-body-sm', period === p ? 'bg-primary-container text-white' : 'bg-surface-container-lowest hover:bg-surface-container-low'].join(' ')}
            >
              {p}
            </button>
          ))}
        </div>

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
