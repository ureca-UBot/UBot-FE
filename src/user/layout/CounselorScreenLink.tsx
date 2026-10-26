import { Link } from 'react-router-dom'
import icon from '../assets/header-counselor.svg'

export function CounselorScreenLink() {
  return (
    <Link className="admin-screen-link" to="/counselor" aria-label="상담사 화면">
      <span className="header-action-icon" aria-hidden="true">
        <img src={icon} width={40} height={40} alt="" />
      </span>
      <span className="header-action-label admin-screen-label">상담사 화면</span>
    </Link>
  )
}
