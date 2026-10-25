import { useEffect, useRef, useState } from 'react'
import { LogoutButton } from '../../auth/components/LogoutButton'
import logo from '../assets/ubot-logo.png'
import storeIcon from '../assets/header-store.svg'
import accountIcon from '../assets/header-account.svg'
import logoutIcon from '../assets/header-logout.svg'
import { NotificationBadge } from '../notification/components/NotificationBadge'
import { useNotificationUnread } from '../notification/hooks/useNotificationUnread'
import type { UserPage } from '../routes'
import { HeaderMegaMenu } from './HeaderMegaMenu'
import { AdminScreenLink } from './AdminScreenLink'

interface DesktopHeaderProps {
  isAdmin: boolean
  loggedIn: boolean
  canLogout: boolean
  memberName: string | null
  scrolled: boolean
  page: UserPage
  onBrandClick: () => void
}

const mainNav = [
  { page: 'ai', label: 'AI 채팅' },
  { page: 'stores', label: '매장 정보' },
  { page: 'store', label: '상품 정보' },
  { page: 'notices', label: '공지/장애 안내' },
  { page: 'customer', label: '고객센터' },
] as const

export function DesktopHeader({
  isAdmin,
  canLogout,
  loggedIn,
  memberName,
  scrolled,
  page,
  onBrandClick,
}: DesktopHeaderProps) {
  const { unreadCount } = useNotificationUnread()
  const isLoggedIn = loggedIn || Boolean(memberName)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuTriggerRef = useRef<HTMLButtonElement | null>(null)
  useEffect(() => {
    if (!menuOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      menuTriggerRef.current?.focus({ preventScroll: true })
      setMenuOpen(false)
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [menuOpen])

  return (
    <header className={`desktop-header simple-header${scrolled ? ' scrolled' : ''}`}>
      <div className="global-nav">
        <button
          className="utility-brand"
          data-route="ai"
          aria-label="U봇 AI 채팅 홈"
          onClick={onBrandClick}
          type="button"
        >
          <img src={logo} alt="U봇" />
        </button>
        <nav
          className="gnb"
          aria-label="주요 메뉴"
          onMouseEnter={() => setMenuOpen(true)}
          onMouseLeave={() => setMenuOpen(false)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setMenuOpen(false)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.stopPropagation()
              menuTriggerRef.current?.focus({ preventScroll: true })
              setMenuOpen(false)
            }
          }}
        >
          {mainNav.map(({ page: navPage, label }) => (
            <div className="gnb-item" key={navPage}>
              <button
                aria-current={page === navPage ? 'page' : undefined}
                className={page === navPage ? 'active' : undefined}
                data-route={navPage}
                aria-expanded={menuOpen}
                aria-controls="header-menu-all"
                onMouseEnter={(event) => {
                  menuTriggerRef.current = event.currentTarget
                  setMenuOpen(true)
                }}
                onFocus={(event) => {
                  menuTriggerRef.current = event.currentTarget
                  setMenuOpen(true)
                }}
                onClick={() => setMenuOpen(false)}
                type="button"
              >
                {label}
              </button>
            </div>
          ))}
          <HeaderMegaMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
        </nav>
        <div className="header-tools">
          {isAdmin && <AdminScreenLink />}
          <button className="header-action" data-route="stores" aria-label="매장찾기" type="button">
            <span className="header-action-icon" aria-hidden="true">
              <img src={storeIcon} width={40} height={40} alt="" />
            </span>
            <span className="header-action-label">매장찾기</span>
          </button>
          <button
            className={`header-action${isLoggedIn ? ' header-member' : ' open-login'}`}
            data-route={isLoggedIn ? 'my' : undefined}
            aria-label={isLoggedIn ? '유저 정보로 이동' : '로그인'}
            type="button"
          >
            <span className="header-action-icon" aria-hidden="true">
              <img src={accountIcon} width={40} height={40} alt="" />
              {isLoggedIn && (
                <NotificationBadge className="notif-badge--icon" count={unreadCount} />
              )}
            </span>
            <span className="header-action-label">
              {memberName ? `${memberName}님` : isLoggedIn ? '내 정보' : '로그인'}
            </span>
          </button>
          {canLogout && (
            <LogoutButton className="header-action" redirectTo={null}>
              <span className="header-action-icon" aria-hidden="true">
                <img src={logoutIcon} width={40} height={40} alt="" />
              </span>
              <span className="header-action-label">로그아웃</span>
            </LogoutButton>
          )}
        </div>
      </div>
    </header>
  )
}
