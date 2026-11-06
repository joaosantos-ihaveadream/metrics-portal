import type { Values } from '../../metrics'
import type { TeamRow } from './teamRows'

export type InsightTone = 'attention' | 'watch' | 'positive'

export interface Insight {
  squadId: string
  tone: InsightTone
  title: string
  body: string
  /** A coaching question, never a judgement. */
  prompt: string
}

const pct = (v: number) => `${Math.round(v * 100)}%`
const TONE_ORDER: Record<InsightTone, number> = { attention: 0, watch: 1, positive: 2 }

/** Rule-based insights for one team, current window against the previous one. */
export function insightsForTeam(
  name: string, teamType: 'scrum' | 'kanban', cur: Values, prev: Values,
): Omit<Insight, 'squadId'>[] {
  const out: Omit<Insight, 'squadId'>[] = []
  const scrum = teamType === 'scrum'
  const { sayDo, scopeChange, cycleP85, bugRatio, throughput, velocityCv } = cur

  if (scrum && scopeChange !== null && sayDo !== null && scopeChange > 0.25 && sayDo < 0.75) {
    out.push({
      tone: 'attention',
      title: `${name}: added scope is eroding commitments`,
      body: `${pct(scopeChange)} of the commitment was added mid-sprint and Say/Do is ${pct(sayDo)}.`,
      prompt: 'Where is the added work coming from — and could it wait for the next planning?',
    })
  } else if (scrum && sayDo !== null && sayDo < 0.65) {
    out.push({
      tone: 'attention',
      title: `${name}: commitments consistently out of reach`,
      body: `Say/Do is ${pct(sayDo)}, below the 65% line.`,
      prompt: 'What would make the next commitment feel safe to keep?',
    })
  }

  if (cycleP85 !== null && prev.cycleP85 && cycleP85 > prev.cycleP85 * 1.3) {
    out.push({
      tone: cycleP85 > 15 ? 'attention' : 'watch',
      title: `${name}: flow is slowing down`,
      body: `Cycle time (85th pct) rose from ${prev.cycleP85.toFixed(1)} to ${cycleP85.toFixed(1)} days.`,
      prompt: 'Where does work wait the longest, and what is it waiting for?',
    })
  } else if (cycleP85 !== null && prev.cycleP85 && cycleP85 < prev.cycleP85 * 0.8) {
    out.push({
      tone: 'positive',
      title: `${name}: faster flow`,
      body: `Cycle time (85th pct) fell from ${prev.cycleP85.toFixed(1)} to ${cycleP85.toFixed(1)} days.`,
      prompt: 'What changed that is worth keeping, and could other teams use it?',
    })
  }

  if (bugRatio !== null && prev.bugRatio !== null && bugRatio > 0.3 && bugRatio - prev.bugRatio > 0.05) {
    out.push({
      tone: 'attention',
      title: `${name}: more capacity going to bugs`,
      body: `Bugs are ${pct(bugRatio)} of finished work, up from ${pct(prev.bugRatio)}.`,
      prompt: 'Is there a common cause behind these bugs that one fix could remove?',
    })
  }

  if (throughput !== null && prev.throughput && throughput < prev.throughput * 0.75) {
    out.push({
      tone: 'watch',
      title: `${name}: throughput dropped`,
      body: `${throughput.toFixed(1)} items a week, down from ${prev.throughput.toFixed(1)}.`,
      prompt: 'Was this a change in how work is split, or in how much is getting finished?',
    })
  }

  if (scrum && velocityCv !== null && velocityCv > 0.3) {
    out.push({
      tone: 'watch',
      title: `${name}: velocity is hard to forecast`,
      body: `Sprint velocity varies by ${pct(velocityCv)} from sprint to sprint.`,
      prompt: 'What tends to differ between the strong sprints and the weak ones?',
    })
  }

  if (scrum && sayDo !== null && prev.sayDo !== null && sayDo >= 0.85 && prev.sayDo < 0.82) {
    out.push({
      tone: 'positive',
      title: `${name}: reliability improving`,
      body: `Say/Do is ${pct(sayDo)}, up from ${pct(prev.sayDo)}.`,
      prompt: 'What is helping the team keep its commitments, and how can it stay that way?',
    })
  }
  return out
}

/** All insights across teams, attention first, then watch, then positive (stable within a tone). */
export function buildInsights(rows: TeamRow[]): Insight[] {
  return rows
    .flatMap((r) =>
      insightsForTeam(r.squad.name, r.squad.teamType, r.current.values, r.previous.values).map((i) => ({
        ...i,
        squadId: r.squad.id,
      })),
    )
    .sort((a, b) => TONE_ORDER[a.tone] - TONE_ORDER[b.tone])
}
