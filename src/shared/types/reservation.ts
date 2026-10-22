export type ReservationPurpose =
  | 'PURCHASE_CONSULTING'
  | 'PLAN_CHANGE'
  | 'DEVICE_CHANGE'
  | 'ACTIVATION'
  | 'OWNERSHIP_TRANSFER'
  | 'USIM_REPLACEMENT'
  | 'LOSS_DAMAGE_REPORT'

export type ReservationStatus = 'RESERVED' | 'CANCELED' | 'COMPLETED' | 'NO_SHOW'

export interface ReservationStore {
  id: number
  name: string
}

export interface ReservationSlotResponse {
  time: string
  available: boolean
}

export interface ReservationCreateRequest {
  storeId: number
  purpose: ReservationPurpose
  visitAt: string
}

export interface ReservationResponse {
  reservationId: number
  userId: number
  storeId: number
  storeName: string
  storeAddress: string | null
  storePhoneNumber: string | null
  purpose: ReservationPurpose
  purposeName: string
  visitAt: string
  status: ReservationStatus
  createdAt: string
  canceledAt: string | null
}

export const RESERVATION_PURPOSE_LABELS: Record<ReservationPurpose, string> = {
  PURCHASE_CONSULTING: '구매 상담',
  PLAN_CHANGE: '요금제 변경',
  DEVICE_CHANGE: '기기변경',
  ACTIVATION: '개통',
  OWNERSHIP_TRANSFER: '명의변경',
  USIM_REPLACEMENT: '유심 교체',
  LOSS_DAMAGE_REPORT: '분실·파손 접수',
}

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  RESERVED: '예약 확정',
  CANCELED: '취소',
  COMPLETED: '방문 완료',
  NO_SHOW: '노쇼',
}

export const MAX_RESERVATION_DAYS_AHEAD = 14

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export function toLocalDate(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
}

export function formatVisitAt(visitAt: string) {
  const date = new Date(visitAt)
  return `${date.getMonth() + 1}/${date.getDate()}(${WEEKDAYS[date.getDay()]}) ${visitAt.slice(11, 16)}`
}

export function formatDateTime(value: string) {
  return value.replace('T', ' ').slice(0, 16)
}
