import { describe, expect, it } from 'vitest'
import { generateMockDataset } from '../data/sources/mock/generate'
import { parsePeriod, parseScope, scopeGroups, scopeKey, scopeLabel, scopeSquads } from './scope'

const d = generateMockDataset()

describe('scope', () => {
  it('lists the 5 pods in the Pod group', () => {
    expect(scopeGroups(d).find((g) => g.kind === 'pod')?.options).toHaveLength(5)
  })
  it('hides the Pod group without pods', () => {
    expect(scopeGroups({ ...d, pods: [] }).some((g) => g.kind === 'pod')).toBe(false)
  })
  it('filters teams and names the scope', () => {
    expect(scopeSquads(d, { kind: 'all' })).toHaveLength(d.squads.length)
    const pod = d.pods[0]
    expect(scopeSquads(d, { kind: 'pod', id: pod.id }).every((s) => s.podId === pod.id)).toBe(true)
    expect(scopeLabel(d, { kind: 'all' })).toBe('Global Platforms')
    expect(scopeLabel(d, { kind: 'pod', id: pod.id })).toBe(`${pod.name} pod`)
    expect(scopeLabel(d, { kind: 'lead', id: d.deliveryLeads[0].id })).toBe(`${d.deliveryLeads[0].name}'s teams`)
  })
  it('round-trips saved state and rejects junk', () => {
    expect(parseScope(scopeKey({ kind: 'team', id: 'x' }))).toEqual({ kind: 'team', id: 'x' })
    expect(parseScope('nonsense:')).toEqual({ kind: 'all' })
    expect(parsePeriod('180')).toBe(180)
    expect(parsePeriod('7')).toBe(90)
  })
})
