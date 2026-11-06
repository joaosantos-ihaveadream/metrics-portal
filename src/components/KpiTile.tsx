import type { ReactNode } from 'react'
import type { IconType } from 'react-icons'
import { MdInfoOutline } from 'react-icons/md'
import type { Signal } from '../metrics/catalogue'
import { Sparkline } from './charts/Sparkline'
import { StatusBadge } from './StatusBadge'

export interface KpiTileProps {
  label: string
  /** Tooltip: the metric's description. */
  description: string
  icon: IconType
  value: string
  unit?: string
  trend?: (number | null)[]
  delta?: ReactNode
  /** e.g. "vs prev. 90d". */
  deltaNote?: string
  signal?: Signal | null
  footer?: ReactNode
  /** Makes the whole tile a link. */
  href?: string
}

export function KpiTile(p: KpiTileProps) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="flex items-center gap-1 text-label-md uppercase text-on-surface-variant">
          {p.label}
          <span title={p.description} role="img" aria-label={p.description}><MdInfoOutline size={14} className="text-outline" /></span>
        </span>
        <p.icon size={20} className="text-outline" aria-hidden />
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="text-display-lg text-on-surface">
          {p.value}
          {p.unit && <span className="ml-0.5 text-body-sm font-normal text-on-surface-variant">{p.unit}</span>}
        </div>
        {p.trend && <Sparkline values={p.trend} />}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
        {p.delta}
        {p.deltaNote && <span className="text-label-sm text-outline">{p.deltaNote}</span>}
        {p.signal && <span className="ml-auto"><StatusBadge signal={p.signal} /></span>}
      </div>
      {p.footer && <div className="mt-3 border-t border-surface-container pt-3 text-label-md text-on-surface-variant">{p.footer}</div>}
    </>
  )
  const cls = 'block rounded-card border border-outline-variant bg-surface-container-lowest p-5'
  return p.href ? <a href={p.href} className={`${cls} hover:bg-surface-container-low`}>{body}</a> : <div className={cls}>{body}</div>
}
