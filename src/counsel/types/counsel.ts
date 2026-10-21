export interface Session {
  sessionId: string
  status: 'WAITING' | 'ACTIVE' | 'PAUSED' | 'ENDED'
  assignmentVersion: number
  lastDeliveredSeq: number
  conversationId: string | null
  handoffId: string | null
}
export interface HistoryMessage {
  sequence: number
  role: 'USER' | 'AI' | 'COUNSELOR'
  content: string
  source: 'SAVED' | 'COUNSEL'
}
export interface HandoffRequest {
  handoffId: string
  conversationId: string | null
}
export interface Delivery {
  messageId: number
  mine: boolean
  senderRole: string
  content: string
  deliverySequence: number
  createdAt: string
}
export interface Receipt {
  messageId: number
  clientMessageId: string
  status: 'PENDING' | 'ALLOWED' | 'BLOCKED' | 'CHECK_FAILED'
  deliverySequence: number | null
}
export interface SafetyEvent {
  id: number
  createdAt: string
  sessionId: string
  senderRole: string
  decision: string
  category: string | null
  score: number | null
  threshold: number
  modelName: string
  profileVersion: string
  ruleVersion: string
  errorCode: string | null
}
export interface Summary {
  total: number
  allowed: number
  blocked: number
  checkFailed: number
  falsePositives: number
}
export interface EventsPage {
  items: SafetyEvent[]
  page: number
  hasNext: boolean
}
