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
  profile?: string | null
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
  cutoff?: string | null
  result: Record<string, unknown>
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
  caseCount: number
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
  capabilities?: { checkMultiSelect: boolean; checkSelectionAnalysis: boolean }
  settings: ReviewSettings
  runs: ReviewRun[]
  history: History[]
  retention?: { detailDays: number; summaryDays: number; historyDays: number }
}
export interface Finding {
  id: number
  sourceKey: string
  stage: string
  category?: string
  createdAt?: string
  question: string | null
  answer: string | null
  detailsRetained?: boolean
  origin?: GuardOrigin
  guardOutcome?: GuardOutcome
  guardReasons?: string[]
  context?: Record<string, unknown>
  finalAnswer?: string | null
}
export type GuardOrigin = 'INPUT_CODE' | 'INPUT_LLM' | 'OUTPUT_CODE' | 'OUTPUT_LLM' | 'UNKNOWN'
export type GuardOutcome =
  | 'PASS'
  | 'FILTERED'
  | 'REJECTED'
  | 'REVIEW'
  | 'ERROR'
  | 'SKIPPED'
  | 'UNKNOWN'
export interface GuardFilters {
  origin?: GuardOrigin
  outcome?: GuardOutcome
  origins?: GuardOrigin[]
  outcomes?: GuardOutcome[]
}
export interface GuardCheck {
  id: number
  attemptId: number | null
  origin: GuardOrigin
  outcome: GuardOutcome
  reasons: string[]
  question: string | null
  answerPreview: string | null
  createdAt: string
  detailsRetained: boolean
  skippedOrigins?: GuardOrigin[]
}
export interface GuardCheckDetail {
  check: GuardCheck
  answer: string | null
  finalAnswer: string | null
  explanation: string | null
  context: Record<string, unknown>
  reassessments?: {
    runId: number
    status: string
    result: { verdict: string; reason: string } | null
  }[]
}
export interface ReviewNotification {
  id: number
  candidateId: number
  message: string
  read: boolean
}
