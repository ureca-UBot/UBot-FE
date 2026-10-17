import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../auth/hooks/useAuth'
import { notificationApi } from '../api/notificationApi'
import { NotificationUnreadContext, type NotificationUnreadContextValue } from './NotificationUnreadContext'

// 화면을 켜 둔 채 새 알림이 와도 헤더 숫자가 갱신되도록 주기적으로 다시 받아옵니다.
const REFRESH_INTERVAL_MS = 60_000

interface LoadedCount {
    userId: string
    count: number | null
}

// 헤더·홈의 알림 숫자와 MY 알림 목록이 같은 읽지 않은 개수를 보도록 공유합니다.
export function NotificationUnreadProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth()
    const userId = user?.id ?? null
    const [loaded, setLoaded] = useState<LoadedCount | null>(null)

    const refreshUnreadCount = useCallback(async () => {
        if (!userId) return
        try {
            const { unreadCount } = await notificationApi.getUnreadCount()
            setLoaded({ userId, count: unreadCount })
        } catch {
            // 표시용 조회라 실패는 무시하고 직전 값을 유지합니다. 오류 안내는 MY 알림 목록이 담당합니다.
        }
    }, [userId])

    const setUnreadCount = useCallback((update: (current: number | null) => number | null) => {
        if (!userId) return
        setLoaded((previous) => ({
            userId,
            count: update(previous?.userId === userId ? previous.count : null),
        }))
    }, [userId])

    useEffect(() => {
        if (!userId) return undefined
        let cancelled = false
        const load = () => {
            notificationApi.getUnreadCount()
                .then(({ unreadCount }) => {
                    if (!cancelled) setLoaded({ userId, count: unreadCount })
                })
                .catch(() => {
                    // 표시용 조회라 실패는 무시하고 직전 값을 유지합니다.
                })
        }
        const loadIfVisible = () => {
            if (document.visibilityState === 'visible') load()
        }

        load()
        const timer = window.setInterval(loadIfVisible, REFRESH_INTERVAL_MS)
        document.addEventListener('visibilitychange', loadIfVisible)
        window.addEventListener('focus', loadIfVisible)
        return () => {
            cancelled = true
            window.clearInterval(timer)
            document.removeEventListener('visibilitychange', loadIfVisible)
            window.removeEventListener('focus', loadIfVisible)
        }
    }, [userId])

    // 로그아웃했거나 다른 계정으로 바뀐 직후에는 이전 사용자의 개수를 보여주지 않습니다.
    const unreadCount = userId && loaded?.userId === userId ? loaded.count : null

    const value = useMemo<NotificationUnreadContextValue>(
        () => ({ unreadCount, refreshUnreadCount, setUnreadCount }),
        [unreadCount, refreshUnreadCount, setUnreadCount],
    )

    return <NotificationUnreadContext value={value}>{children}</NotificationUnreadContext>
}