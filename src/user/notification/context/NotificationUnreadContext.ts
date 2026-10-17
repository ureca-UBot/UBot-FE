import { createContext } from 'react'

export interface NotificationUnreadContextValue {
    /** 읽지 않은 알림 개수. 비로그인이거나 아직 불러오지 못했으면 null입니다. */
    unreadCount: number | null
    /** 서버에서 개수를 다시 받아옵니다. 실패하면 직전 값을 그대로 둡니다. */
    refreshUnreadCount: () => Promise<void>
    /** 알림을 읽었을 때처럼 개수를 바로 바꿔야 할 때 씁니다. */
    setUnreadCount: (update: (current: number | null) => number | null) => void
}

export const NotificationUnreadContext = createContext<NotificationUnreadContextValue | null>(null)