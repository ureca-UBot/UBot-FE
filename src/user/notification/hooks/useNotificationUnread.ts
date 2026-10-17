import { useContext } from 'react'
import { NotificationUnreadContext } from '../context/NotificationUnreadContext'

export function useNotificationUnread() {
    const value = useContext(NotificationUnreadContext)
    if (!value) throw new Error('useNotificationUnread는 NotificationUnreadProvider 안에서 사용해야 합니다.')
    return value
}