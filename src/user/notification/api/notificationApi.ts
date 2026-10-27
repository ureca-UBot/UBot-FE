import { apiClient } from '../../../shared/api/client'

export type NotificationType =
  | 'RESERVATION_CONFIRMED'
  | 'RESERVATION_CANCELED'
  | 'RESERVATION_REMINDER'
  | 'BILLING_DUE_SOON'
  | 'BILLING_OVERDUE'
  | 'ROAMING_START'
  | 'ROAMING_END'
  | 'CONTRACT_EXPIRING'
  | 'INSTALLMENT_EXPIRING'
  | 'DATA_USAGE_THRESHOLD'

export interface NotificationResponse {
  notificationId: number
  type: NotificationType
  title: string
  message: string
  reservationId: number | null
  read: boolean
  createdAt: string
}

export interface UnreadCountResponse {
  unreadCount: number
}

export interface ReadAllResponse {
  updatedCount: number
}

export const notificationApi = {
  getMyNotificationList: () => apiClient.get<NotificationResponse[]>('/api/notifications/me'),
  getUnreadCount: () => apiClient.get<UnreadCountResponse>('/api/notifications/me/unread-count'),
  readNotification: (notificationId: number) =>
    apiClient.patch<NotificationResponse>(`/api/notifications/${notificationId}/read`, {}),
  readAllNotifications: () =>
    apiClient.patch<ReadAllResponse>('/api/notifications/me/read-all', {}),
}
