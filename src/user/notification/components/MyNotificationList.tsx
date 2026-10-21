import { formatDateTime } from '../../reservation/types/reservation'
import { useMyNotifications } from '../hooks/useMyNotifications'
import { getNotificationCategory } from '../types/notificationMeta'

export function MyNotificationList({ active }: { active: boolean }) {
  const { unreadCount, readingAll, readAll, notifications, error, read } = useMyNotifications({
    active,
  })
  return (
    <section className="my-profile" aria-labelledby="myNotificationTitle">
      <div className="my-profile-head">
        <h3 id="myNotificationTitle">
          알림{unreadCount > 0 && <em className="my-unread-count">{unreadCount}</em>}
        </h3>
        {unreadCount > 0 && (
          <button
            className="my-profile-ghost"
            disabled={readingAll}
            onClick={() => void readAll()}
            type="button"
          >
            {readingAll ? '처리 중…' : '전체 읽음'}
          </button>
        )}
      </div>

      {notifications === null && !error && (
        <p className="my-profile-message">알림을 불러오는 중입니다.</p>
      )}
      {notifications?.length === 0 && <p className="my-profile-message">새 알림이 없습니다.</p>}

      {notifications && notifications.length > 0 && (
        <ul className="my-item-list">
          {notifications.map((notification) => {
            const { category, label } = getNotificationCategory(notification.type)
            return (
              <li
                className={notification.read ? 'read' : 'unread'}
                key={notification.notificationId}
              >
                <button onClick={() => void read(notification)} type="button">
                  <span className="notification-head">
                    <i className={`notification-category notification-category--${category}`}>
                      {label}
                    </i>
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

      {error && (
        <p className="my-profile-message error" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}
