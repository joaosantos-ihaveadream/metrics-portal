import type { IconType } from 'react-icons'
import {
  MdAccountBalance,
  MdDashboard,
  MdFavoriteBorder,
  MdGroups,
  MdMenuBook,
  MdOutlineSecurity,
  MdSpeed,
  MdStorage,
  MdVerified,
  MdDeveloperBoard,
  MdSupportAgent,
} from 'react-icons/md'

export interface NavItem {
  id: string
  label: string
  path: string
  icon: IconType
}

export const deliveryNav: NavItem[] = [
  { id: 'overview', label: 'Overview', path: '/', icon: MdDashboard },
  { id: 'health', label: 'Health index', path: '/health', icon: MdFavoriteBorder },
  { id: 'flow', label: 'Flow', path: '/flow', icon: MdSpeed },
  { id: 'quality', label: 'Quality', path: '/quality', icon: MdVerified },
  { id: 'teams', label: 'Teams', path: '/teams', icon: MdGroups },
]

export const playbookNav: NavItem[] = [
  { id: 'metrics', label: 'Metric catalogue', path: '/metrics', icon: MdMenuBook },
]

export const comingNav: NavItem[] = [
  { id: 'engineering', label: 'Engineering (DORA)', path: '/coming/engineering', icon: MdDeveloperBoard },
  { id: 'service-ops', label: 'Service & Ops', path: '/coming/service-ops', icon: MdSupportAgent },
  { id: 'risk-security', label: 'Risk & Security', path: '/coming/risk-security', icon: MdOutlineSecurity },
  { id: 'finance', label: 'Finance', path: '/coming/finance', icon: MdAccountBalance },
]

export const dataNav: NavItem = { id: 'data', label: 'Data sources', path: '/data', icon: MdStorage }

export type Resolved =
  | { kind: 'page'; id: string; title: string; params: Record<string, string> }
  | { kind: 'coming'; id: string; title: string }
  | { kind: 'notFound' }

/** Maps a hash path to a page. Legacy links (#/predictability, #/squads) still resolve. */
export function resolve(path: string): Resolved {
  const parts = path.split('/').filter(Boolean)
  const [head, arg] = parts
  if (parts.length === 0) return { kind: 'page', id: 'overview', title: 'Overview', params: {} }
  if (parts.length === 1) {
    switch (head) {
      case 'health':
      case 'predictability':
        return { kind: 'page', id: 'health', title: 'Health index', params: {} }
      case 'flow':
        return { kind: 'page', id: 'flow', title: 'Flow', params: {} }
      case 'quality':
        return { kind: 'page', id: 'quality', title: 'Quality', params: {} }
      case 'teams':
      case 'squads':
        return { kind: 'page', id: 'teams', title: 'Teams', params: {} }
      case 'metrics':
        return { kind: 'page', id: 'metrics', title: 'Metric catalogue', params: {} }
      case 'data':
        return { kind: 'page', id: 'data', title: 'Data sources', params: {} }
    }
  }
  if (parts.length === 2) {
    if (head === 'teams' || head === 'squads') {
      return { kind: 'page', id: 'team-detail', title: 'Team detail', params: { id: arg } }
    }
    if (head === 'coming') {
      const item = comingNav.find((c) => c.id === arg)
      if (item) return { kind: 'coming', id: item.id, title: item.label }
    }
  }
  return { kind: 'notFound' }
}

/** Sidebar item that should be highlighted for a resolved page. */
export function activeNavId(r: Resolved): string | null {
  if (r.kind === 'coming') return r.id
  if (r.kind === 'notFound') return null
  return r.id === 'team-detail' ? 'teams' : r.id
}
