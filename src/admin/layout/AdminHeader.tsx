import { Link } from 'react-router-dom'
import { LogoutButton } from '../../auth/components/LogoutButton'
import { useAuth } from '../../auth/hooks/useAuth'

export function AdminHeader() {
  const { user } = useAuth()

  return (
    <header className="admin-header">
      <Link className="secondary-button admin-home-link" to="/ai">
        홈 화면
      </Link>
      <div className="admin-account">
        <div>
          <p className="admin-account__name">관리자 #{user?.id}</p>
          <p className="admin-account__role">{user?.role}</p>
        </div>
        <LogoutButton />
      </div>
    </header>
  )
}
