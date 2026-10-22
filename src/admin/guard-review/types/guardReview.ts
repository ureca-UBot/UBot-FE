export type ReviewKind = 'WORD' | 'WARNING'
export interface Candidate {
  id: number
  kind: ReviewKind
  category: string
  expression: string
  reason: string
  intent: string
  revision: number
  status: string
  wordId: number | null
  occurrences: number
  unreadOccurrences: number
}
export interface Selection {
  candidateId: number
  revision: number
}
export interface ReviewSettings {
  enabled: boolean
  intervalMinutes: number
  groupingThreshold: number
  revision: number
  nextRunAt: string | null
}
export interface ReviewRun {
  id: number
  kind: 'ANALYSIS' | 'VALIDATION'
  status: string
  processed: number
  total: number
  result: string
  createdAt: string
  analysisMode?: 'INCREMENTAL' | 'FULL' | null
  detailsRetained?: boolean
}
export interface CaseResult {
  id: string
  category: string
  stage: string
  before: string
  after: string
  falsePositive: boolean
  regression: boolean
  baselineFailure: boolean
  newDetection: boolean
}
export interface Validation {
  baseVersion: string
  datasetVersion: string
  cases: CaseResult[]
  falsePositives: number
  regressions: number
  baselineFailures: number
  newDetections: number
}
export interface History {
  id: number
  candidateId: number
  revision: number
  action: string
  adminId: number | null
  expression: string
  createdAt: string
}
export interface Overview {
  settings: ReviewSettings
  runs: ReviewRun[]
  history: History[]
  retention?: { detailDays: number; summaryDays: number; historyDays: number }
}
export interface Finding {
  id: number
  sourceKey: string
  stage: string
  question: string | null
  answer: string | null
  detailsRetained?: boolean
}
export interface ReviewNotification {
  id: number
  candidateId: number
  message: string
  read: boolean
}
