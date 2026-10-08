import { apiClient } from '../../../shared/api/client'

export type NotificationType = 'RESERVATION_CONFIRMED' | 'RESERVATION_CANCELED'

export interface NotificationResponse {
  notificationId: number
  type: NotificationType
  title: string
  message: string
  reservationId: number | null
  read: boolean
  createdAt: string
}

export const notificationApi = {
  getMyNotificationList: () => apiClient.get<NotificationResponse[]>('/api/notifications/me'),
  readNotification: (notificationId: number) =>
    apiClient.patch<NotificationResponse>(`/api/notifications/${notificationId}/read`, {}),
}
