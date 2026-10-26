import { Link } from 'react-router-dom'
import { LogoutButton } from '../../auth/components/LogoutButton'
import { useAuth } from '../../auth/hooks/useAuth'
import homeIcon from '../../user/assets/header-home.svg'
import logoutIcon from '../../user/assets/header-logout.svg'

export function AdminHeader() {
  const { user } = useAuth()

  return (
    <header className="admin-header">
      <div className="admin-account">
        <div>
          <p className="admin-account__name">관리자 #{user?.id}</p>
          <p className="admin-account__role">{user?.role}</p>
        </div>
        <nav className="admin-header-actions" aria-label="관리자 화면 바로가기">
          <Link className="admin-header-action" to="/ai" aria-label="홈 화면">
            <img src={homeIcon} width={40} height={40} alt="" />
            <span>홈 화면</span>
          </Link>
          <LogoutButton className="admin-header-action">
            <img src={logoutIcon} width={40} height={40} alt="" />
            <span>로그아웃</span>
          </LogoutButton>
        </nav>
      </div>
    </header>
  )
}
