import type { PulseDimension, TeamType } from '../../model'

/** A value that moves linearly from the start of history (a) to the end (b). */
export type Ramp = readonly [number, number]

export interface TeamProfile {
  name: string
  teamType: TeamType
  boardKey: string
  domain: string
  valueStream: string
  deliveryLead: string
  pod: string
  story: string
  itemsPerWeek: Ramp
  cycleMedian: Ramp
  cycleSigma: number
  waitMedian: number
  bugShare: Ramp
  /** Scrum only. */
  velocity?: { mean: number; noise: number }
  sayDo?: Ramp
  scopeChange?: number
  /** Share of stories that are non-OKR aligned. */
  nonOkrShare: Ramp
  pulseBase: Ramp
  pulseOffsets: Partial<Record<PulseDimension, number>>
}

const flat = (v: number): Ramp => [v, v]
const NON_OKR = flat(0.2)

export const TEAM_PROFILES: TeamProfile[] = [
  {
    name: 'Atlas', teamType: 'scrum', boardKey: 'ATL', domain: 'Player Experience', valueStream: 'Onboarding & Account',
    deliveryLead: 'Ana Sousa', pod: 'Growth', story: 'Healthy and improving',
    itemsPerWeek: [6, 7.5], cycleMedian: [4.5, 3.4], cycleSigma: 0.55, waitMedian: 6, bugShare: [0.18, 0.14],
    velocity: { mean: 42, noise: 0.08 }, sayDo: [0.8, 0.9], scopeChange: 0.08, nonOkrShare: NON_OKR,
    pulseBase: [3.9, 4.2], pulseOffsets: {},
  },
  {
    name: 'Borealis', teamType: 'scrum', boardKey: 'BOR', domain: 'Player Experience', valueStream: 'Engagement',
    deliveryLead: 'Ana Sousa', pod: 'Growth', story: 'Scope creep erodes commitments',
    itemsPerWeek: [7, 6.5], cycleMedian: [4, 5.2], cycleSigma: 0.6, waitMedian: 5, bugShare: [0.2, 0.22],
    velocity: { mean: 48, noise: 0.12 }, sayDo: [0.84, 0.63], scopeChange: 0.34, nonOkrShare: NON_OKR,
    pulseBase: [3.9, 3.4], pulseOffsets: { 'Suitable process': -0.6, Mission: -0.4 },
  },
  {
    name: 'Cobalt', teamType: 'kanban', boardKey: 'COB', domain: 'Player Experience', valueStream: 'Engagement',
    deliveryLead: 'Ana Sousa', pod: 'Growth', story: 'Healthy',
    itemsPerWeek: [8, 9], cycleMedian: [3, 2.7], cycleSigma: 0.5, waitMedian: 4, bugShare: [0.16, 0.15],
    nonOkrShare: NON_OKR, pulseBase: [3.8, 3.9], pulseOffsets: {},
  },
  {
    name: 'Dune', teamType: 'scrum', boardKey: 'DUN', domain: 'Payments & Wallet', valueStream: 'Deposits',
    deliveryLead: 'Pedro Lima', pod: 'Checkout', story: 'Healthy',
    itemsPerWeek: [6, 6.2], cycleMedian: [4, 4], cycleSigma: 0.5, waitMedian: 7, bugShare: [0.15, 0.15],
    velocity: { mean: 38, noise: 0.07 }, sayDo: [0.86, 0.88], scopeChange: 0.1, nonOkrShare: NON_OKR,
    pulseBase: [3.8, 3.9], pulseOffsets: {},
  },
  {
    name: 'Ember', teamType: 'scrum', boardKey: 'EMB', domain: 'Payments & Wallet', valueStream: 'Deposits',
    deliveryLead: 'Pedro Lima', pod: 'Checkout', story: 'Bug share climbing; codebase pulse falls',
    itemsPerWeek: [6.5, 7], cycleMedian: [4.2, 4.6], cycleSigma: 0.55, waitMedian: 5, bugShare: [0.2, 0.42],
    velocity: { mean: 44, noise: 0.1 }, sayDo: [0.82, 0.76], scopeChange: 0.16, nonOkrShare: NON_OKR,
    pulseBase: [3.8, 3.5], pulseOffsets: { 'Health of codebase': -0.9, 'Easy to release': -0.5 },
  },
  {
    name: 'Fjord', teamType: 'kanban', boardKey: 'FJO', domain: 'Payments & Wallet', valueStream: 'Withdrawals & Risk',
    deliveryLead: 'Pedro Lima', pod: 'Risk & Compliance', story: 'Flow slowing; ageing WIP grows',
    itemsPerWeek: [7, 5], cycleMedian: [3.5, 8.5], cycleSigma: 0.65, waitMedian: 5, bugShare: [0.2, 0.24],
    nonOkrShare: NON_OKR, pulseBase: [3.8, 3.4], pulseOffsets: { Speed: -0.7 },
  },
  {
    name: 'Granite', teamType: 'scrum', boardKey: 'GRA', domain: 'Payments & Wallet', valueStream: 'Withdrawals & Risk',
    deliveryLead: 'Sofia Costa', pod: 'Risk & Compliance', story: 'Chronic over-commitment; low pulse',
    itemsPerWeek: [5, 5.2], cycleMedian: [6, 6.2], cycleSigma: 0.6, waitMedian: 9, bugShare: [0.22, 0.24],
    velocity: { mean: 30, noise: 0.14 }, sayDo: [0.6, 0.58], scopeChange: 0.2, nonOkrShare: NON_OKR,
    pulseBase: [3.3, 3.0], pulseOffsets: { Speed: -0.6, 'Suitable process': -0.4, Fun: -0.3 },
  },
  {
    name: 'Halo', teamType: 'scrum', boardKey: 'HAL', domain: 'Core Platform', valueStream: 'Identity & Access',
    deliveryLead: 'Sofia Costa', pod: 'Identity', story: 'Healthy',
    itemsPerWeek: [5.5, 6], cycleMedian: [4.8, 4.4], cycleSigma: 0.5, waitMedian: 8, bugShare: [0.14, 0.12],
    velocity: { mean: 36, noise: 0.08 }, sayDo: [0.85, 0.87], scopeChange: 0.09, nonOkrShare: NON_OKR,
    pulseBase: [3.8, 3.9], pulseOffsets: {},
  },
  {
    name: 'Iris', teamType: 'kanban', boardKey: 'IRI', domain: 'Core Platform', valueStream: 'Identity & Access',
    deliveryLead: 'Sofia Costa', pod: 'Identity', story: 'Improving after a WIP-limit experiment',
    itemsPerWeek: [5, 7.5], cycleMedian: [6, 3.6], cycleSigma: 0.55, waitMedian: 6, bugShare: [0.18, 0.15],
    nonOkrShare: NON_OKR, pulseBase: [3.2, 4.1], pulseOffsets: {},
  },
  {
    name: 'Juno', teamType: 'scrum', boardKey: 'JUN', domain: 'Core Platform', valueStream: 'Platform Services',
    deliveryLead: 'Tiago Nunes', pod: 'Foundations', story: 'Volatile velocity; more non-OKR work',
    itemsPerWeek: [6, 6], cycleMedian: [5, 5.3], cycleSigma: 0.7, waitMedian: 6, bugShare: [0.17, 0.18],
    velocity: { mean: 40, noise: 0.42 }, sayDo: [0.76, 0.74], scopeChange: 0.14, nonOkrShare: [0.25, 0.45],
    pulseBase: [3.6, 3.5], pulseOffsets: { 'Suitable process': -0.4, 'Health of codebase': -0.3 },
  },
  {
    name: 'Kestrel', teamType: 'scrum', boardKey: 'KES', domain: 'Core Platform', valueStream: 'Platform Services',
    deliveryLead: 'Tiago Nunes', pod: 'Foundations', story: 'Healthy',
    itemsPerWeek: [7, 7.4], cycleMedian: [3.6, 3.3], cycleSigma: 0.5, waitMedian: 5, bugShare: [0.13, 0.12],
    velocity: { mean: 50, noise: 0.07 }, sayDo: [0.88, 0.91], scopeChange: 0.07, nonOkrShare: NON_OKR,
    pulseBase: [4.1, 4.2], pulseOffsets: {},
  },
  {
    name: 'Lumen', teamType: 'kanban', boardKey: 'LUM', domain: 'Core Platform', valueStream: 'Platform Services',
    deliveryLead: 'Tiago Nunes', pod: 'Foundations', story: 'Throughput dropping',
    itemsPerWeek: [9, 4.5], cycleMedian: [3.2, 4.2], cycleSigma: 0.55, waitMedian: 4, bugShare: [0.19, 0.2],
    nonOkrShare: NON_OKR, pulseBase: [3.8, 3.3],
    // The spec's "autonomy" is not one of the ten dimensions; "Pawns or players" is the closest.
    pulseOffsets: { Support: -0.5, 'Pawns or players': -0.5 },
  },
]
