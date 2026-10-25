import { AdminScreenLink } from './AdminScreenLink'
import logo from '../assets/ubot-logo.png'
import accountIcon from '../assets/header-account.svg'

interface MobileHeaderProps {
  isAdmin: boolean
  title: string
}

export function MobileHeader({ isAdmin, title }: MobileHeaderProps) {
  return (
    <>
      <header className="mobile-header">
        <div className="mobile-title-wrap">
          <img className="mobile-brand-logo" src={logo} alt="U봇" />
          <span id="mobileTitle" className="sr-only-title">
            {title}
          </span>
        </div>
        <div className="mobile-actions">
          {isAdmin && <AdminScreenLink />}
          <button className="mobile-icon-btn" data-route="my" aria-label="내 정보" type="button">
            <img src={accountIcon} width={32} height={32} alt="" />
          </button>
        </div>
      </header>
    </>
  )
}
