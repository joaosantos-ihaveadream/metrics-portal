import type {
  Dataset, DeliveryLead, Domain, Initiative, Pod, Sprint, Squad, TeamType, ValueStream, WorkCategory, WorkItem, WorkType,
} from '../../model'
import { parseCsv, type CsvTable } from './csv'
import { parseDate } from './dates'

export interface TeamEntry {
  name: string
  teamType: TeamType
  domain: string
  valueStream?: string
  deliveryLead?: string
  pod?: string
  /** Jira project keys, taken from the issue keys. */
  issueMatch?: string[]
  /** Board names, or sprint-name prefixes when there is no Board column. */
  sprintMatch?: string[]
}

export interface ColumnConfig {
  columns?: Partial<Record<ColumnName, string>>
  /** Issue type (lower case) to work type, or "drop". */
  types?: Record<string, WorkType | 'drop'>
  /** Category value (lower case) to category. */
  categories?: Record<string, WorkCategory>
}

const DEFAULT_COLUMNS = {
  issue: 'Issue',
  type: 'Issue type',
  created: 'Issue created date',
  started: 'First in progress date',
  resolved: 'Issue resolution date',
  points: 'Issue Story Points',
  epic: 'Issue Epic Link',
  category: 'Work category',
  sprint: 'Sprint',
  board: 'Board',
  sprintStart: 'Sprint start date',
  sprintEnd: 'Sprint end date',
  committed: 'Sprint Story Points committed',
  added: 'Sprint Story Points added',
  removed: 'Sprint Story Points removed',
  completed: 'Sprint Story Points completed',
  completedOfCommitted: 'Sprint Story Points completed of committed',
  goalMet: 'Sprint goal met',
} as const
export type ColumnName = keyof typeof DEFAULT_COLUMNS

const DEFAULT_TYPES: Record<string, WorkType | 'drop'> = {
  story: 'story', bug: 'bug', task: 'task', epic: 'drop', 'sub-task': 'drop', subtask: 'drop', 'sub task': 'drop',
}

const DEFAULT_CATEGORIES: Record<string, WorkCategory> = {
  'okr aligned': 'OKR aligned', okr: 'OKR aligned',
  'non-okr aligned': 'Non-OKR aligned', 'non-okr': 'Non-OKR aligned', 'non okr': 'Non-OKR aligned', 'non okr aligned': 'Non-OKR aligned',
  'keep the lights on': 'Keep the lights on', ktlo: 'Keep the lights on',
  'l&d': 'L&D', learning: 'L&D', 'learning and development': 'L&D',
}

export interface Summary {
  issues: { total: number; used: number; excludedByType: number; unmatched: number; withoutStart: number; notDone: number; withoutPoints: number; unknownCategory: number }
  sprints: { total: number; used: number; unmatched: number; completedOfCommittedEstimated: number }
  teamsByType: Record<TeamType, number>
  teamsWithoutIssues: number
  teamNames: string[]
}

/** A readable error: names the file, row and column, never the cell value (except dates, to show the format). */
export class ConversionError extends Error {}

export const slug = (s: string) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export interface ConvertInput {
  issuesCsv: string
  sprintsCsv: string
  teams: TeamEntry[]
  config?: ColumnConfig
  /** ISO snapshot date. */
  asOf: string
}

class Reader {
  private index: Map<string, number>
  constructor(private file: string, private table: CsvTable, private names: Record<ColumnName, string>) {
    this.index = new Map(table.headers.map((h, i) => [h.toLowerCase(), i]))
  }
  has(col: ColumnName) { return this.index.has(this.names[col].toLowerCase()) }
  require(...cols: ColumnName[]) {
    for (const c of cols) if (!this.has(c)) throw new ConversionError(`${this.file}: missing column "${this.names[c]}".`)
  }
  get rows() { return this.table.rows }
  text(row: string[], col: ColumnName): string {
    const i = this.index.get(this.names[col].toLowerCase())
    return i === undefined ? '' : (row[i] ?? '').trim()
  }
  fail(rowNo: number, col: ColumnName, problem: string, value?: string): never {
    throw new ConversionError(`${this.file} row ${rowNo}, column "${this.names[col]}": ${problem}${value === undefined ? '' : ` (got "${value}")`}.`)
  }
  date(row: string[], rowNo: number, col: ColumnName, optional: boolean): string | null {
    const raw = this.text(row, col)
    if (!raw) return optional ? null : this.fail(rowNo, col, 'a date is required')
    return parseDate(raw) ?? this.fail(rowNo, col, 'unrecognised date, expected yyyy-mm-dd, dd/mm/yyyy or ISO', raw)
  }
  number(row: string[], rowNo: number, col: ColumnName, optional: boolean): number | null {
    const raw = this.text(row, col).replace(',', '.')
    if (raw === '') return optional ? null : this.fail(rowNo, col, 'a number is required')
    const n = Number(raw)
    return Number.isFinite(n) ? n : this.fail(rowNo, col, 'not a number')
  }
}

export function validateTeams(raw: unknown): TeamEntry[] {
  const list = Array.isArray(raw) ? raw : (raw as { teams?: unknown })?.teams
  if (!Array.isArray(list) || list.length === 0) throw new ConversionError('squads.json: expected a non-empty list of teams.')
  const seen = new Set<string>()
  return list.map((t: Partial<TeamEntry>, i) => {
    const at = `squads.json team ${i + 1}`
    if (!t || typeof t.name !== 'string' || !t.name.trim()) throw new ConversionError(`${at}: "name" is required.`)
    if (t.teamType !== 'scrum' && t.teamType !== 'kanban') throw new ConversionError(`${at}: "teamType" must be "scrum" or "kanban".`)
    if (typeof t.domain !== 'string' || !t.domain.trim()) throw new ConversionError(`${at}: "domain" is required.`)
    if (seen.has(slug(t.name))) throw new ConversionError(`${at}: duplicate team name.`)
    seen.add(slug(t.name))
    for (const k of ['issueMatch', 'sprintMatch'] as const) {
      if (t[k] !== undefined && (!Array.isArray(t[k]) || t[k]!.some((v) => typeof v !== 'string'))) {
        throw new ConversionError(`${at}: "${k}" must be a list of text values.`)
      }
    }
    return t as TeamEntry
  })
}

export function convertExports(input: ConvertInput): { dataset: Dataset; summary: Summary } {
  const names = { ...DEFAULT_COLUMNS, ...input.config?.columns }
  const types = { ...DEFAULT_TYPES, ...input.config?.types }
  const categoryMap = { ...DEFAULT_CATEGORIES, ...input.config?.categories }

  // Organisation, built from the team list.
  const domains = new Map<string, Domain>()
  const valueStreams = new Map<string, ValueStream>()
  const leads = new Map<string, DeliveryLead>()
  const pods = new Map<string, Pod>()
  const squads: Squad[] = input.teams.map((t) => {
    const domainId = slug(t.domain)
    if (!domains.has(domainId)) domains.set(domainId, { id: domainId, name: t.domain, manager: '' })
    const vsName = t.valueStream?.trim() || 'Unassigned'
    const valueStreamId = `${domainId}-${slug(vsName)}`
    if (!valueStreams.has(valueStreamId)) valueStreams.set(valueStreamId, { id: valueStreamId, name: vsName, domainId })
    const leadName = t.deliveryLead?.trim() || 'Unassigned'
    if (!leads.has(slug(leadName))) leads.set(slug(leadName), { id: slug(leadName), name: leadName })
    let podId: string | null = null
    if (t.pod?.trim()) {
      podId = slug(t.pod)
      if (!pods.has(podId)) pods.set(podId, { id: podId, name: t.pod })
    }
    return {
      id: slug(t.name), name: t.name, domainId, valueStreamId, deliveryLeadId: slug(leadName), podId,
      teamType: t.teamType, boardKey: t.issueMatch?.[0] ?? '',
    }
  })

  const projectToSquad = new Map<string, string>()
  const boardToSquad = new Map<string, string>()
  const prefixes: [string, string][] = []
  input.teams.forEach((t, i) => {
    for (const k of t.issueMatch ?? []) projectToSquad.set(k.toLowerCase(), squads[i].id)
    for (const b of t.sprintMatch ?? []) {
      boardToSquad.set(b.toLowerCase(), squads[i].id)
      prefixes.push([b.toLowerCase(), squads[i].id])
    }
  })
  prefixes.sort((a, b) => b[0].length - a[0].length)

  const summary: Summary = {
    issues: { total: 0, used: 0, excludedByType: 0, unmatched: 0, withoutStart: 0, notDone: 0, withoutPoints: 0, unknownCategory: 0 },
    sprints: { total: 0, used: 0, unmatched: 0, completedOfCommittedEstimated: 0 },
    teamsByType: { scrum: 0, kanban: 0 },
    teamsWithoutIssues: 0,
    teamNames: input.teams.map((t) => t.name),
  }
  for (const s of squads) summary.teamsByType[s.teamType]++

  // Issues.
  const issues = new Reader('issues.csv', parseCsv(input.issuesCsv), names)
  issues.require('issue', 'type', 'created', 'started', 'resolved', 'points')
  const workItems: WorkItem[] = []
  const initiatives = new Map<string, Initiative>()
  const squadById = new Map(squads.map((s) => [s.id, s]))
  const squadsWithIssues = new Set<string>()
  issues.rows.forEach((row, n) => {
    const rowNo = n + 2
    summary.issues.total++
    const typeRaw = issues.text(row, 'type')
    const mapped = types[typeRaw.toLowerCase()] ?? 'task'
    if (mapped === 'drop') { summary.issues.excludedByType++; return }
    const issue = issues.text(row, 'issue')
    const space = issue.indexOf(' ')
    const key = space < 0 ? issue : issue.slice(0, space)
    const project = key.slice(0, Math.max(0, key.lastIndexOf('-')))
    if (!key || !project) issues.fail(rowNo, 'issue', 'expected "KEY-123 Summary"')
    const squadId = projectToSquad.get(project.toLowerCase())
    // Validate dates even for unmatched rows so format problems surface early.
    const createdAt = issues.date(row, rowNo, 'created', false)!
    const startedAt = issues.date(row, rowNo, 'started', true)
    const doneAt = issues.date(row, rowNo, 'resolved', true)
    if (!squadId) { summary.issues.unmatched++; return }
    squadsWithIssues.add(squadId)
    const storyPoints = issues.number(row, rowNo, 'points', true)
    if (!startedAt) summary.issues.withoutStart++
    if (!doneAt) summary.issues.notDone++
    if (storyPoints === null) summary.issues.withoutPoints++

    let category: WorkCategory = 'None'
    if (issues.has('category')) {
      const raw = issues.text(row, 'category')
      if (raw) {
        const hit = categoryMap[raw.toLowerCase()]
        if (hit) category = hit
        else summary.issues.unknownCategory++
      }
    }

    let initiativeId: string | null = null
    const epic = issues.has('epic') ? issues.text(row, 'epic') : ''
    if (epic) {
      initiativeId = slug(epic)
      if (initiativeId && !initiatives.has(initiativeId)) {
        const sq = squadById.get(squadId)!
        initiatives.set(initiativeId, {
          id: initiativeId, name: epic, domainId: sq.domainId, valueStreamId: sq.valueStreamId,
          targetDate: input.asOf, status: 'in progress',
        })
      }
      if (!initiativeId) initiativeId = null
    }
    workItems.push({
      key, squadId, type: mapped, category, summary: space < 0 ? '' : issue.slice(space + 1).trim(),
      storyPoints, initiativeId, createdAt, startedAt, doneAt,
    })
    summary.issues.used++
  })
  summary.teamsWithoutIssues = squads.length - squadsWithIssues.size

  // Sprints.
  const sp = new Reader('sprints.csv', parseCsv(input.sprintsCsv), names)
  sp.require('sprint', 'sprintStart', 'sprintEnd', 'committed', 'added', 'removed', 'completed')
  const sprints: Sprint[] = []
  const usedIds = new Set<string>()
  sp.rows.forEach((row, n) => {
    const rowNo = n + 2
    summary.sprints.total++
    const name = sp.text(row, 'sprint')
    const board = sp.has('board') ? sp.text(row, 'board').toLowerCase() : ''
    const squadId = (board && boardToSquad.get(board)) || (!sp.has('board') ? prefixes.find(([p]) => name.toLowerCase().startsWith(p))?.[1] : undefined)
    const startDate = sp.date(row, rowNo, 'sprintStart', false)!
    const endDate = sp.date(row, rowNo, 'sprintEnd', false)!
    const committed = sp.number(row, rowNo, 'committed', false)!
    const added = sp.number(row, rowNo, 'added', false)!
    const removed = sp.number(row, rowNo, 'removed', false)!
    const completed = sp.number(row, rowNo, 'completed', false)!
    if (!squadId) { summary.sprints.unmatched++; return }
    let completedCommitted = sp.has('completedOfCommitted') ? sp.number(row, rowNo, 'completedOfCommitted', true) : null
    if (completedCommitted === null) {
      completedCommitted = Math.min(completed, committed - removed)
      summary.sprints.completedOfCommittedEstimated++
    }
    let goalMet: boolean | null = null
    if (sp.has('goalMet')) {
      const raw = sp.text(row, 'goalMet').toLowerCase()
      if (['yes', 'y', 'true'].includes(raw)) goalMet = true
      else if (['no', 'n', 'false'].includes(raw)) goalMet = false
      else if (raw !== '') sp.fail(rowNo, 'goalMet', 'expected Yes or No')
    }
    let id = `${squadId}-${slug(name)}`
    for (let i = 2; usedIds.has(id); i++) id = `${squadId}-${slug(name)}-${i}`
    usedIds.add(id)
    sprints.push({
      id, squadId, name, startDate, endDate,
      committedPoints: committed, completedCommittedPoints: completedCommitted,
      addedPoints: added, completedAddedPoints: Math.max(0, completed - completedCommitted),
      removedPoints: removed, goal: '', goalMet,
    })
    summary.sprints.used++
  })

  const dataset: Dataset = {
    asOf: input.asOf,
    source: { id: 'eazybi', label: 'eazyBI snapshot', isDummy: false },
    domains: [...domains.values()],
    valueStreams: [...valueStreams.values()],
    deliveryLeads: [...leads.values()],
    pods: [...pods.values()],
    squads,
    initiatives: [...initiatives.values()],
    workItems,
    sprints,
    // eazyBI has no pulse checks; the health index uses its other inputs.
    pulseChecks: [],
  }
  return { dataset, summary }
}

/** Counts and column names only. Team names are added by `verbose` (local use only). */
export function formatSummary(s: Summary, verbose: boolean): string {
  const i = s.issues
  const p = s.sprints
  const lines = [
    `Issues: ${i.used} used of ${i.total} rows`,
    `  excluded by type (epics, sub-tasks): ${i.excludedByType}`,
    `  matching no team: ${i.unmatched}`,
    `  without a start date: ${i.withoutStart}`,
    `  not done yet: ${i.notDone}`,
    `  without story points: ${i.withoutPoints}`,
    `  with an unknown category (treated as None): ${i.unknownCategory}`,
    `Sprints: ${p.used} used of ${p.total} rows`,
    `  matching no team: ${p.unmatched}`,
    `  completed of committed estimated: ${p.completedOfCommittedEstimated}`,
    `Teams: ${s.teamsByType.scrum} scrum, ${s.teamsByType.kanban} kanban, ${s.teamsWithoutIssues} with no matched issues`,
  ]
  if (verbose) lines.push(`Team names: ${s.teamNames.join(', ')}`)
  return lines.join('\n')
}
