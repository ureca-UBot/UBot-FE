import { type ReservationStatus } from '../../../shared/types/reservation'
export type AdminStatus = Exclude<ReservationStatus, 'RESERVED'>

export const STATUS_ACTIONS: { status: AdminStatus; label: string; confirm?: string }[] = [
  { status: 'COMPLETED', label: '방문 완료' },
  { status: 'NO_SHOW', label: '노쇼', confirm: '노쇼로 처리할까요?' },
  { status: 'CANCELED', label: '취소', confirm: '예약을 취소할까요? 고객에게 취소 알림이 갑니다.' },
]
