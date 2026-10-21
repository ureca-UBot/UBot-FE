export type InquiryStatus = 'RECEIVED' | 'RESOLVED'

export interface Inquiry {
  id: number
  title: string
  content: string
  status: InquiryStatus
  adminReply: string | null
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
}
