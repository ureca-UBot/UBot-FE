import { LogoutButton } from '../../auth/components/LogoutButton'
import { useAuth } from '../../auth/hooks/useAuth'

export function AdminHeader() {
  const { user } = useAuth()

  return (
    <header className="admin-header">
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
