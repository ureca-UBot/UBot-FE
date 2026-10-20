import { useEffect, useState } from 'react'
import { notificationApi, type NotificationResponse } from '../api/notificationApi'
import { useNotificationUnread } from './useNotificationUnread'

export function useMyNotifications({ active }: { active: boolean }) {
  const [notifications, setNotifications] = useState<NotificationResponse[] | null>(null)
  // 목록은 최근 50건만 오므로, 읽지 않은 전체 개수는 헤더와 함께 쓰는 서버 값을 따릅니다. 실패하면 목록 기준으로 셉니다.
  const {
    unreadCount: serverUnreadCount,
    refreshUnreadCount,
    setUnreadCount,
  } = useNotificationUnread()
  const [readingAll, setReadingAll] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!active) return
    let cancelled = false
    notificationApi
      .getMyNotificationList()
      .then((next) => {
        if (cancelled) return
        setNotifications(next)
        setError(null)
      })
      .catch((caught: unknown) => {
        if (!cancelled)
          setError(caught instanceof Error ? caught.message : '알림을 불러오지 못했습니다.')
      })
    void refreshUnreadCount()
    return () => {
      cancelled = true
    }
  }, [active, refreshUnreadCount])

  async function read(notification: NotificationResponse) {
    if (notification.read) return
    try {
      const updated = await notificationApi.readNotification(notification.notificationId)
      setNotifications(
        (current) =>
          current?.map((item) =>
            item.notificationId === updated.notificationId ? updated : item,
          ) ?? null,
      )
      setUnreadCount((current) => (current === null ? null : Math.max(0, current - 1)))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '알림을 읽음 처리하지 못했습니다.')
    }
  }

  async function readAll() {
    if (readingAll) return
    setReadingAll(true)
    try {
      await notificationApi.readAllNotifications()
      setNotifications((current) => current?.map((item) => ({ ...item, read: true })) ?? null)
      setUnreadCount(() => 0)
      setError(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '알림을 모두 읽음 처리하지 못했습니다.')
    } finally {
      setReadingAll(false)
    }
  }

  const listUnreadCount = notifications?.filter((notification) => !notification.read).length ?? 0
  const unreadCount = serverUnreadCount ?? listUnreadCount

  return { unreadCount, readingAll, readAll, notifications, error, read }
}
