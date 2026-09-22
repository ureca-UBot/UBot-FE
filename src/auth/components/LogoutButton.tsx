import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

interface LogoutButtonProps {
  className?: string
}

export function LogoutButton({ className = 'logout-button' }: LogoutButtonProps) {
  const navigate = useNavigate()
  const { logout } = useAuth()

  async function handleLogout() {
    try {
      await logout()
    } finally {
      navigate('/auth/login', { replace: true })
    }
  }

  return <button className={className} onClick={() => void handleLogout()} type="button">로그아웃</button>
}
