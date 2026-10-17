import { useEffect, useState } from 'react'
import { formatDateTime } from '../../reservation/types/reservation'
import { notificationApi, type NotificationResponse } from '../api/notificationApi'
import { getNotificationCategory } from '../types/notificationMeta'

export function MyNotificationList({ active }: { active: boolean }) {
  const [notifications, setNotifications] = useState<NotificationResponse[] | null>(null)
  // 목록은 최근 50건만 오므로, 읽지 않은 전체 개수는 서버 값을 따로 받아 둡니다. 실패하면 목록 기준으로 셉니다.
  const [serverUnreadCount, setServerUnreadCount] = useState<number | null>(null)
  const [readingAll, setReadingAll] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!active) return
    let cancelled = false
    notificationApi.getMyNotificationList()
      .then((next) => {
        if (cancelled) return
        setNotifications(next)
        setError(null)
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : '알림을 불러오지 못했습니다.')
      })
    notificationApi.getUnreadCount()
      .then((next) => {
        if (!cancelled) setServerUnreadCount(next.unreadCount)
      })
      .catch(() => {
        if (!cancelled) setServerUnreadCount(null)
      })
    return () => {
      cancelled = true
    }
  }, [active])

  async function read(notification: NotificationResponse) {
    if (notification.read) return
    try {
      const updated = await notificationApi.readNotification(notification.notificationId)
      setNotifications((current) => current?.map((item) => (item.notificationId === updated.notificationId ? updated : item)) ?? null)
      setServerUnreadCount((current) => (current === null ? null : Math.max(0, current - 1)))
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
      setServerUnreadCount(0)
      setError(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '알림을 모두 읽음 처리하지 못했습니다.')
    } finally {
      setReadingAll(false)
    }
  }

  const listUnreadCount = notifications?.filter((notification) => !notification.read).length ?? 0
  const unreadCount = serverUnreadCount ?? listUnreadCount

  return (
    <section className="my-profile" aria-labelledby="myNotificationTitle">
      <div className="my-profile-head">
        <h3 id="myNotificationTitle">알림{unreadCount > 0 && <em className="my-unread-count">{unreadCount}</em>}</h3>
        {unreadCount > 0 && (
          <button className="my-profile-ghost" disabled={readingAll} onClick={() => void readAll()} type="button">
            {readingAll ? '처리 중…' : '전체 읽음'}
          </button>
        )}
      </div>

      {notifications === null && !error && <p className="my-profile-message">알림을 불러오는 중입니다.</p>}
      {notifications?.length === 0 && <p className="my-profile-message">새 알림이 없습니다.</p>}

      {notifications && notifications.length > 0 && (
        <ul className="my-item-list">
          {notifications.map((notification) => {
            const { category, label } = getNotificationCategory(notification.type)
            return (
              <li className={notification.read ? 'read' : 'unread'} key={notification.notificationId}>
                <button onClick={() => void read(notification)} type="button">
                  <span className="notification-head">
                    <i className={`notification-category notification-category--${category}`}>{label}</i>
                    <b>{notification.title}</b>
                  </span>
                  <span>{notification.message}</span>
                  <small>{formatDateTime(notification.createdAt)}</small>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {error && <p className="my-profile-message error" role="alert">{error}</p>}
    </section>
  )
}