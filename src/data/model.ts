export type TeamType = 'scrum' | 'kanban'
export type WorkType = 'story' | 'bug' | 'task'
export type InitiativeStatus = 'not started' | 'in progress' | 'done'

export const WORK_CATEGORIES = [
  'OKR aligned',
  'Non-OKR aligned',
  'Keep the lights on',
  'L&D',
  'None',
] as const
export type WorkCategory = (typeof WORK_CATEGORIES)[number]

export const PULSE_DIMENSIONS = [
  'Delivering value',
  'Easy to release',
  'Health of codebase',
  'Speed',
  'Suitable process',
  'Mission',
  'Fun',
  'Learning',
  'Support',
  'Pawns or players',
] as const
export type PulseDimension = (typeof PULSE_DIMENSIONS)[number]

/** A pulse with fewer respondents than this is hidden. */
export const MIN_PULSE_RESPONDENTS = 3

export interface Domain {
  id: string
  name: string
  manager: string
}

export interface ValueStream {
  id: string
  name: string
  domainId: string
}

export interface DeliveryLead {
  id: string
  name: string
}

export interface Pod {
  id: string
  name: string
}

/** A team. Called Squad in code; the UI always says "team". */
export interface Squad {
  id: string
  name: string
  domainId: string
  valueStreamId: string
  deliveryLeadId: string
  podId: string | null
  teamType: TeamType
  boardKey: string
}

export interface Initiative {
  id: string
  name: string
  domainId: string
  valueStreamId: string
  targetDate: string
  status: InitiativeStatus
}

export interface WorkItem {
  key: string
  squadId: string
  type: WorkType
  category: WorkCategory
  summary: string
  storyPoints: number | null
  initiativeId: string | null
  createdAt: string
  startedAt: string | null
  doneAt: string | null
}

export interface Sprint {
  id: string
  squadId: string
  name: string
  startDate: string
  endDate: string
  committedPoints: number
  completedCommittedPoints: number
  addedPoints: number
  completedAddedPoints: number
  removedPoints: number
  goal: string
  goalMet: boolean | null
}

export interface PulseCheck {
  id: string
  squadId: string
  date: string
  respondents: number
  scores: Record<PulseDimension, number>
}

export interface DataSourceInfo {
  id: string
  label: string
  isDummy: boolean
}

export interface Dataset {
  asOf: string
  source: DataSourceInfo
  domains: Domain[]
  valueStreams: ValueStream[]
  deliveryLeads: DeliveryLead[]
  pods: Pod[]
  squads: Squad[]
  initiatives: Initiative[]
  workItems: WorkItem[]
  sprints: Sprint[]
  pulseChecks: PulseCheck[]
}
