import type { Dataset } from '../../data/model'
import { formatMetricText } from '../../components/format'
import {
  computePeriod, HEALTH_INPUTS, scoreFor, SIGNAL_METRICS, signalFor, toMs, trend,
  type MetricId, type Signal, type TrendPoint,
} from '../../metrics'
import type { TeamRow } from './teamRows'

export type HighlightKind = 'drop' | 'milestone' | 'rise'

export interface Highlight {
  kind: HighlightKind
  badge: 'Heads-up' | 'Target met' | 'Big improvement'
  squadId: string
  team: string
  metric: MetricId
  headline: string
  body: string
  prompt: string
  from: string
  to: string
  trend: TrendPoint[]
}

const BADGE = { drop: 'Heads-up', milestone: 'Target met', rise: 'Big improvement' } as const
const MAX_HIGHLIGHTS = 3
const DROP_POINTS = 20
const RISE_POINTS = 25
const MILESTONE_BONUS = 10
const RANK: Record<Signal, number> = { 'needs-attention': 0, watch: 1, 'on-track': 2 }

const NAMES: Partial<Record<MetricId, string>> = {
  sayDo: 'completion ratio', scopeChange: 'scope volatility', velocityCv: 'velocity variability',
  throughputCv: 'throughput variability', cycleP85: 'cycle time', leadP85: 'lead time',
  ageingWipShare: 'ageing work in progress', bugRatio: 'bug ratio', pulseScore: 'pulse check',
}

const PROMPTS: Partial<Record<MetricId, string>> = {
  sayDo: 'What would help the team commit to what it can finish?',
  scopeChange: 'Where is the mid-sprint work coming from, and could it wait for planning?',
  velocityCv: 'What differs between the steadier sprints and the uneven ones?',
  throughputCv: 'What makes some weeks much busier than others?',
  cycleP85: 'Where does work wait the longest once it has started?',
  leadP85: 'How long does work sit before the team picks it up, and why?',
  ageingWipShare: 'Which older items are stuck, and what would unblock them?',
  bugRatio: 'Is there a common cause behind the bugs that one fix could remove?',
  pulseScore: 'What are the team members saying, and what would they like to try?',
}

interface Candidate extends Omit<Highlight, 'trend'> {
  /** Ranking weight within its pool (drops: points fallen; wins: points gained, milestones +10). */
  weight: number
}

/** When the dataset starts: the earliest sprint, pulse or finished item. */
export function dataStart(d: Dataset): number {
  const times = [
    ...d.sprints.map((s) => toMs(s.startDate)),
    ...d.pulseChecks.map((p) => toMs(p.date)),
    ...d.workItems.filter((i) => i.doneAt).map((i) => toMs(i.doneAt!)),
  ]
  return times.reduce((a, b) => Math.min(a, b), Infinity)
}

function candidates(rows: TeamRow[], period: number): { drops: Candidate[]; wins: Candidate[] } {
  const drops: Candidate[] = []
  const wins: Candidate[] = []
  for (const r of rows) {
    const type = r.squad.teamType
    const ids = [...new Set<MetricId>([...HEALTH_INPUTS[type], ...SIGNAL_METRICS[type]])]
    for (const id of ids) {
      const now = r.current.values[id]
      const before = r.previous.values[id]
      const scoreNow = scoreFor(id, now)
      const scoreBefore = scoreFor(id, before)
      const sigNow = signalFor(id, now)
      const sigBefore = signalFor(id, before)
      if (now === null || before === null || scoreNow === null || scoreBefore === null || !sigNow || !sigBefore) continue
      const delta = scoreNow - scoreBefore
      const worse = RANK[sigNow] < RANK[sigBefore]
      const milestone = sigNow === 'on-track' && sigBefore !== 'on-track'
      const kind: HighlightKind | null =
        delta <= -DROP_POINTS || worse ? 'drop' : milestone ? 'milestone' : delta >= RISE_POINTS ? 'rise' : null
      if (!kind) continue
      const name = NAMES[id] ?? id
      const was = formatMetricText(id, before)
      const is = formatMetricText(id, now)
      const status =
        kind === 'drop'
          ? sigNow === 'needs-attention' ? 'now needs attention' : sigNow === 'watch' ? 'now on watch' : 'still on track'
          : sigNow === 'on-track' ? 'now on track' : 'moving the right way'
      const c: Candidate = {
        kind, badge: BADGE[kind], squadId: r.squad.id, team: r.squad.name, metric: id,
        headline:
          kind === 'milestone'
            ? `${r.squad.name}: ${name} reached its target at ${is}`
            : `${r.squad.name}: ${name} ${now < before ? 'fell' : 'rose'} to ${is}`,
        body: `${now < before ? 'Down' : 'Up'} from ${was} in the previous ${period} days — ${status}.`,
        prompt: PROMPTS[id] ?? 'What is behind this change?',
        from: was, to: is,
        weight: kind === 'drop' ? -delta : delta + (kind === 'milestone' ? MILESTONE_BONUS : 0),
      }
      ;(kind === 'drop' ? drops : wins).push(c)
    }
  }
  const byWeight = (a: Candidate, b: Candidate) => b.weight - a.weight
  return { drops: drops.sort(byWeight), wins: wins.sort(byWeight) }
}

/** The biggest drop, the biggest win, then the larger of the next drop and next win; later picks prefer new teams. */
export function pickHighlights(drops: Candidate[], wins: Candidate[]): Candidate[] {
  const picked: Candidate[] = []
  const take = (pool: Candidate[]): Candidate | null => {
    const left = pool.filter((c) => !picked.includes(c))
    const fresh = left.find((c) => !picked.some((p) => p.squadId === c.squadId))
    return fresh ?? left[0] ?? null
  }
  const first = drops[0] ?? null
  if (first) picked.push(first)
  const win = take(wins)
  if (win) picked.push(win)
  const next = [take(drops), take(wins)].filter((c): c is Candidate => c !== null)
  const fresh = next.filter((c) => !picked.some((p) => p.squadId === c.squadId))
  const pool = fresh.length ? fresh : next
  const third = pool.reduce<Candidate | null>((best, c) => (!best || c.weight > best.weight ? c : best), null)
  if (third && picked.length < MAX_HIGHLIGHTS) picked.push(third)
  return picked
}

/** Up to 3 stories from the team scorecards; none when the previous window starts before the data does. */
export function buildHighlights(dataset: Dataset, rows: TeamRow[], period: number): Highlight[] {
  if (!rows.length) return []
  const { previousWindow } = computePeriod(dataset, [rows[0].squad.id], period)
  if (previousWindow.start < dataStart(dataset)) return []
  const { drops, wins } = candidates(rows, period)
  return pickHighlights(drops, wins).map(({ weight: _weight, ...c }) => ({
    ...c,
    trend: trend(dataset, [c.squadId], c.metric),
  }))
}
