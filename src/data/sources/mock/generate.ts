import {
  PULSE_DIMENSIONS,
  type Dataset,
  type DeliveryLead,
  type Domain,
  type Initiative,
  type Pod,
  type PulseCheck,
  type PulseDimension,
  type Sprint,
  type Squad,
  type ValueStream,
  type WorkCategory,
  type WorkItem,
  type WorkType,
} from '../../model'
import { createRng, type Rng } from '../../random'
import { TEAM_PROFILES, type Ramp, type TeamProfile } from './profiles'

export const MOCK_SEED = 20261002
export const MOCK_SNAPSHOT = '2026-10-02T18:00:00.000Z'

const DAY_MS = 86_400_000
const HISTORY_DAYS = 220
const SPRINT_COUNT = 13
const FIRST_SPRINT_NUMBER = 41
const PULSE_COUNT = 7

const NOUNS = ['checkout', 'profile', 'wallet', 'login', 'notifications', 'search', 'limits', 'bonus', 'history', 'settings']
const TEMPLATES: Record<WorkType, string[]> = {
  story: ['Improve {n} journey', 'Add {n} options', 'Redesign {n} screen'],
  bug: ['Fix {n} error', '{n} fails intermittently', 'Incorrect {n} display'],
  task: ['Update {n} configuration', 'Refactor {n} module', 'Document {n} flow'],
}
const SPRINT_GOALS = ['Ship the next increment', 'Reduce carry-over', 'Stabilise the release', 'Unblock the dependent teams']

const DOMAINS: { name: string; manager: string; streams: { name: string; initiatives: [string, string] }[] }[] = [
  {
    name: 'Player Experience', manager: 'Marta Reis',
    streams: [
      { name: 'Onboarding & Account', initiatives: ['Frictionless sign-up', 'KYC automation'] },
      { name: 'Engagement', initiatives: ['Personalised home feed', 'Rewards hub'] },
    ],
  },
  {
    name: 'Payments & Wallet', manager: 'Rui Matos',
    streams: [
      { name: 'Deposits', initiatives: ['Open banking deposits', 'Payment method expansion'] },
      { name: 'Withdrawals & Risk', initiatives: ['Instant withdrawals', 'Fraud signal v2'] },
    ],
  },
  {
    name: 'Core Platform', manager: 'Inês Carvalho',
    streams: [
      { name: 'Identity & Access', initiatives: ['Passkeys rollout', 'Session hardening'] },
      { name: 'Platform Services', initiatives: ['Service mesh migration', 'Observability baseline'] },
    ],
  },
]
const LEADS = ['Ana Sousa', 'Pedro Lima', 'Sofia Costa', 'Tiago Nunes']

const slug = (s: string) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const lerp = ([a, b]: Ramp, t: number) => a + (b - a) * t
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const iso = (ms: number) => new Date(ms).toISOString()
const round1 = (v: number) => Math.round(v * 10) / 10

function buildOrganisation() {
  const snapshot = Date.parse(MOCK_SNAPSHOT)
  const domains: Domain[] = []
  const valueStreams: ValueStream[] = []
  const initiatives: Initiative[] = []
  for (const d of DOMAINS) {
    const domainId = slug(d.name)
    domains.push({ id: domainId, name: d.name, manager: d.manager })
    for (const s of d.streams) {
      const valueStreamId = slug(s.name)
      valueStreams.push({ id: valueStreamId, name: s.name, domainId })
      s.initiatives.forEach((name, i) => {
        initiatives.push({
          id: slug(name), name, domainId, valueStreamId,
          targetDate: iso(snapshot + (i === 0 ? 30 : 95) * DAY_MS),
          status: 'in progress',
        })
      })
    }
  }
  const deliveryLeads: DeliveryLead[] = LEADS.map((name) => ({ id: slug(name), name }))
  const podNames = [...new Set(TEAM_PROFILES.map((p) => p.pod))]
  const pods: Pod[] = podNames.map((name) => ({ id: slug(name), name }))
  const squads: Squad[] = TEAM_PROFILES.map((p) => ({
    id: slug(p.name), name: p.name, domainId: slug(p.domain), valueStreamId: slug(p.valueStream),
    deliveryLeadId: slug(p.deliveryLead), podId: slug(p.pod), teamType: p.teamType, boardKey: p.boardKey,
  }))
  return { domains, valueStreams, deliveryLeads, pods, squads, initiatives }
}

function generateWorkItems(
  main: Rng, categories: Rng, profile: TeamProfile, squad: Squad, initiatives: Initiative[], snapshot: number,
): WorkItem[] {
  const items: WorkItem[] = []
  const historyStart = snapshot - HISTORY_DAYS * DAY_MS
  const span = snapshot - historyStart
  const progress = (ms: number) => clamp((ms - historyStart) / span, 0, 1)
  const streamInitiatives = initiatives.filter((i) => i.valueStreamId === squad.valueStreamId)
  let running = 1001

  for (let d = 0; d < HISTORY_DAYS; d++) {
    const day = historyStart + d * DAY_MS
    const weekday = new Date(day).getUTCDay()
    if (weekday === 0 || weekday === 6) continue
    const count = main.poisson(lerp(profile.itemsPerWeek, progress(day)) / 5)
    for (let n = 0; n < count; n++) {
      const created = day + main.between(0.3, 0.7) * DAY_MS
      const started = created + main.logNormal(profile.waitMedian, 0.8) * DAY_MS
      const t = progress(started)
      const cycle = Math.max(0.2, main.logNormal(lerp(profile.cycleMedian, t), profile.cycleSigma))
      const done = started + cycle * DAY_MS

      const roll = main.next()
      const bugShare = lerp(profile.bugShare, t)
      const type: WorkType = roll < bugShare ? 'bug' : roll < bugShare + 0.15 ? 'task' : 'story'
      const summary = main.pick(TEMPLATES[type]).replace('{n}', main.pick(NOUNS))
      const storyPoints = type === 'story' ? main.pick([1, 2, 3, 5, 8]) : type === 'bug' ? main.pick([1, 2, 3]) : null
      const initiativeId =
        type === 'story' && main.chance(0.7) ? main.pick(streamInitiatives).id : null

      let category: WorkCategory
      if (categories.chance(0.05)) category = 'None'
      else if (type === 'bug') category = 'Keep the lights on'
      else if (type === 'task') {
        const r = categories.next()
        category = r < 0.55 ? 'Keep the lights on' : r < 0.8 ? 'L&D' : 'Non-OKR aligned'
      } else {
        category = categories.chance(lerp(profile.nonOkrShare, t)) ? 'Non-OKR aligned' : 'OKR aligned'
      }

      items.push({
        key: `${profile.boardKey}-${running++}`,
        squadId: squad.id, type, category, summary, storyPoints, initiativeId,
        createdAt: iso(created),
        startedAt: started > snapshot ? null : iso(started),
        doneAt: done > snapshot ? null : iso(done),
      })
    }
  }
  return items
}

function generateSprints(main: Rng, profile: TeamProfile, squad: Squad, snapshot: number): Sprint[] {
  if (profile.teamType !== 'scrum' || !profile.velocity || !profile.sayDo || profile.scopeChange === undefined) return []
  const lastEnd = Math.floor(snapshot / DAY_MS) * DAY_MS - 2 * DAY_MS
  const sprints: Sprint[] = []
  for (let i = 0; i < SPRINT_COUNT; i++) {
    const end = lastEnd - (SPRINT_COUNT - 1 - i) * 14 * DAY_MS
    const t = i / (SPRINT_COUNT - 1)
    const committed = Math.max(8, profile.velocity.mean * (1 + profile.velocity.noise * main.normal()))
    const sayDo = clamp(lerp(profile.sayDo, t) + 0.05 * main.normal(), 0.3, 1)
    const added = Math.max(0, committed * (profile.scopeChange + 0.06 * main.normal()))
    // Points are whole numbers: round first, then derive the completed figures from the rounded ones.
    const committedPts = Math.round(committed)
    const addedPts = Math.round(added)
    const completedCommitted = committedPts * sayDo
    const completedAdded = addedPts * main.between(0.4, 0.9)
    const removed = committedPts * main.between(0, 0.08)
    const goalMet = main.chance(sayDo >= 0.8 ? 0.85 : sayDo >= 0.65 ? 0.5 : 0.2)
    const number = FIRST_SPRINT_NUMBER + i
    sprints.push({
      id: `${squad.id}-sprint-${number}`, squadId: squad.id, name: `${profile.name} Sprint ${number}`,
      startDate: iso(end - 14 * DAY_MS), endDate: iso(end),
      committedPoints: committedPts, completedCommittedPoints: Math.round(completedCommitted),
      addedPoints: addedPts, completedAddedPoints: Math.round(completedAdded),
      removedPoints: Math.round(removed),
      goal: SPRINT_GOALS[i % SPRINT_GOALS.length], goalMet,
    })
  }
  return sprints
}

function generatePulses(pulse: Rng, profile: TeamProfile, squad: Squad, snapshot: number): PulseCheck[] {
  const latest = Math.floor(snapshot / DAY_MS) * DAY_MS - 5 * DAY_MS
  const checks: PulseCheck[] = []
  for (let i = 0; i < PULSE_COUNT; i++) {
    const t = i / (PULSE_COUNT - 1)
    const date = latest - (PULSE_COUNT - 1 - i) * 28 * DAY_MS
    const respondents = pulse.int(5, 9)
    const scores = {} as Record<PulseDimension, number>
    for (const dim of PULSE_DIMENSIONS) {
      const offset = profile.pulseOffsets[dim] ?? 0
      const raw = lerp(profile.pulseBase, t) + offset * (0.3 + 0.7 * t) + 0.25 * pulse.normal()
      scores[dim] = round1(clamp(raw, 1, 5))
    }
    checks.push({ id: `${squad.id}-pulse-${i + 1}`, squadId: squad.id, date: iso(date), respondents, scores })
  }
  return checks
}

export function generateMockDataset(seed: number = MOCK_SEED): Dataset {
  const snapshot = Date.parse(MOCK_SNAPSHOT)
  const main = createRng(seed)
  const categories = createRng(seed + 1)
  const pulse = createRng(seed + 2)
  const org = buildOrganisation()
  const profiles = new Map(TEAM_PROFILES.map((p) => [slug(p.name), p]))

  const workItems = org.squads.flatMap((s) =>
    generateWorkItems(main, categories, profiles.get(s.id)!, s, org.initiatives, snapshot),
  )
  const sprints = org.squads.flatMap((s) => generateSprints(main, profiles.get(s.id)!, s, snapshot))
  const pulseChecks = org.squads.flatMap((s) => generatePulses(pulse, profiles.get(s.id)!, s, snapshot))

  return {
    asOf: MOCK_SNAPSHOT,
    source: { id: 'mock', label: 'Dummy data', isDummy: true },
    ...org,
    workItems,
    sprints,
    pulseChecks,
  }
}
