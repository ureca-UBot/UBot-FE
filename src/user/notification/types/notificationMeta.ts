import type { NotificationType } from '../api/notificationApi'

export type NotificationCategory =
  | 'reservation'
  | 'billing'
  | 'roaming'
  | 'contract'
  | 'data'
  | 'etc'

const categoryByType: Record<NotificationType, NotificationCategory> = {
  RESERVATION_CONFIRMED: 'reservation',
  RESERVATION_CANCELED: 'reservation',
  RESERVATION_REMINDER: 'reservation',
  BILLING_DUE_SOON: 'billing',
  BILLING_OVERDUE: 'billing',
  ROAMING_START: 'roaming',
  ROAMING_END: 'roaming',
  CONTRACT_EXPIRING: 'contract',
  INSTALLMENT_EXPIRING: 'contract',
  DATA_USAGE_THRESHOLD: 'data',
}

const categoryLabels: Record<NotificationCategory, string> = {
  reservation: '예약',
  billing: '요금',
  roaming: '로밍',
  contract: '약정·할부',
  data: '데이터',
  etc: '알림',
}

/**
 * 알림 종류를 화면 구분(뱃지 색상·라벨)으로 바꿉니다.
 * 서버가 새 종류를 추가해도 화면이 깨지지 않도록, 모르는 종류는 기본 구분(etc)으로 보여줍니다.
 */
export function getNotificationCategory(type: string): {
  category: NotificationCategory
  label: string
} {
  const category =
    (categoryByType as Record<string, NotificationCategory | undefined>)[type] ?? 'etc'
  return { category, label: categoryLabels[category] }
}
