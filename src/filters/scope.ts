import type { Dataset, Squad } from '../data/model'
import { DEFAULT_PERIOD, PERIODS, type Period } from '../metrics/periods'

export type ScopeKind = 'domain' | 'lead' | 'team' | 'pod'
export type Scope = { kind: 'all' } | { kind: ScopeKind; id: string }

export const ALL_SCOPE: Scope = { kind: 'all' }

export interface ScopeGroup {
  label: string
  kind: ScopeKind
  options: { id: string; name: string }[]
}

/** Dropdown groups in display order. The Pod group only exists when the dataset has pods. */
export function scopeGroups(d: Dataset): ScopeGroup[] {
  const groups: ScopeGroup[] = [
    { label: 'Domain', kind: 'domain', options: d.domains },
    { label: 'Delivery Lead', kind: 'lead', options: d.deliveryLeads },
    { label: 'Team', kind: 'team', options: d.squads },
  ]
  if (d.pods.length) groups.push({ label: 'Pod', kind: 'pod', options: d.pods })
  return groups
}

const matches = (s: Squad, scope: Scope): boolean => {
  switch (scope.kind) {
    case 'all': return true
    case 'domain': return s.domainId === scope.id
    case 'lead': return s.deliveryLeadId === scope.id
    case 'team': return s.id === scope.id
    case 'pod': return s.podId === scope.id
  }
}

export const scopeSquads = (d: Dataset, scope: Scope): Squad[] => d.squads.filter((s) => matches(s, scope))

/** Name used in the page subtitle. */
export function scopeLabel(d: Dataset, scope: Scope): string {
  switch (scope.kind) {
    case 'all': return 'Global Platforms'
    case 'domain': return d.domains.find((x) => x.id === scope.id)?.name ?? 'Unknown domain'
    case 'lead': return `${d.deliveryLeads.find((x) => x.id === scope.id)?.name ?? 'Unknown'}'s teams`
    case 'pod': return `${d.pods.find((x) => x.id === scope.id)?.name ?? 'Unknown'} pod`
    case 'team': return d.squads.find((x) => x.id === scope.id)?.name ?? 'Unknown team'
  }
}

export const scopeKey = (s: Scope) => (s.kind === 'all' ? 'all' : `${s.kind}:${s.id}`)

export function parseScope(raw: string | null): Scope {
  if (!raw || raw === 'all') return ALL_SCOPE
  const [kind, ...rest] = raw.split(':')
  const id = rest.join(':')
  return id && ['domain', 'lead', 'team', 'pod'].includes(kind) ? { kind: kind as ScopeKind, id } : ALL_SCOPE
}

export function parsePeriod(raw: string | null): Period {
  const n = Number(raw)
  return (PERIODS as readonly number[]).includes(n) ? (n as Period) : DEFAULT_PERIOD
}
