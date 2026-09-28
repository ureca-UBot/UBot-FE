import { type ReactNode, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

interface LogoutButtonProps {
  className?: string
  /** 로그아웃 후 이동할 경로. null이면 현재 화면에 머뭅니다. */
  redirectTo?: string | null
  /** 버튼 안에 보여줄 내용. 기본은 "로그아웃" 글자입니다. */
  children?: ReactNode
}

export function LogoutButton({ className = 'logout-button', redirectTo = '/auth/login', children }: LogoutButtonProps) {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  async function handleLogout() {
    setIsLoggingOut(true)
    try {
      await logout()
    } finally {
      setIsLoggingOut(false)
      if (redirectTo) navigate(redirectTo, { replace: true })
    }
  }

  return (
    <button aria-label="로그아웃" className={className} disabled={isLoggingOut} onClick={() => void handleLogout()} type="button">
      {children ?? '로그아웃'}
    </button>
  )
}
