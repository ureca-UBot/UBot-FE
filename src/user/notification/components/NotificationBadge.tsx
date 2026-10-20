const MAX_DISPLAY_COUNT = 99

interface NotificationBadgeProps {
  count: number | null
  /** 놓는 위치에 따라 다른 모양을 쓰려고 덧붙이는 클래스입니다. */
  className?: string
}

/** 읽지 않은 알림 개수를 빨간 동그라미로 보여줍니다. 0개이거나 모르면 아무것도 그리지 않습니다. */
export function NotificationBadge({ count, className = '' }: NotificationBadgeProps) {
  if (!count || count <= 0) return null
  return (
    <i className={`notif-badge ${className}`.trim()} aria-hidden="true">
      {count > MAX_DISPLAY_COUNT ? `${MAX_DISPLAY_COUNT}+` : count}
    </i>
  )
}
