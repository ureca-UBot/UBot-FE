import { useEffect, useState } from 'react'
import { formatDateTime } from '../../reservation/types/reservation'
import { notificationApi, type NotificationResponse } from '../api/notificationApi'

export function MyNotificationList({ active }: { active: boolean }) {
  const [notifications, setNotifications] = useState<NotificationResponse[] | null>(null)
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
    return () => {
      cancelled = true
    }
  }, [active])

  async function read(notification: NotificationResponse) {
    if (notification.read) return
    try {
      const updated = await notificationApi.readNotification(notification.notificationId)
      setNotifications((current) => current?.map((item) => (item.notificationId === updated.notificationId ? updated : item)) ?? null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '알림을 읽음 처리하지 못했습니다.')
    }
  }

  const unreadCount = notifications?.filter((notification) => !notification.read).length ?? 0

  return (
    <section className="my-profile" aria-labelledby="myNotificationTitle">
      <div className="my-profile-head">
        <h3 id="myNotificationTitle">알림{unreadCount > 0 && <em className="my-unread-count">{unreadCount}</em>}</h3>
      </div>

      {notifications === null && !error && <p className="my-profile-message">알림을 불러오는 중입니다.</p>}
      {notifications?.length === 0 && <p className="my-profile-message">새 알림이 없습니다.</p>}

      {notifications && notifications.length > 0 && (
        <ul className="my-item-list">
          {notifications.map((notification) => (
            <li className={notification.read ? 'read' : 'unread'} key={notification.notificationId}>
              <button onClick={() => void read(notification)} type="button">
                <b>{notification.title}</b>
                <span>{notification.message}</span>
                <small>{formatDateTime(notification.createdAt)}</small>
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="my-profile-message error" role="alert">{error}</p>}
    </section>
  )
}
