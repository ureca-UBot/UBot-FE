import type { Inquiry } from '../../../shared/types/inquiry'
export type { InquiryStatus } from '../../../shared/types/inquiry'

export interface AdminInquiry {
  inquiry: Inquiry
  userId: number
  userName: string
  resolvedById: number | null
}
