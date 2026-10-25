import { Link } from 'react-router-dom'
import icon from '../assets/admin-screen.svg'

export function AdminScreenLink() {
  return (
    <Link className="admin-screen-link" to="/admin/dashboard" aria-label="관리자 화면">
      <span className="header-action-icon">
        <img src={icon} width={40} height={40} alt="" />
      </span>
      <span className="header-action-label admin-screen-label">관리자 화면</span>
    </Link>
  )
}
