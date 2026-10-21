import { LogoutButton } from '../../auth/components/LogoutButton'
import logo from '../assets/ubot-logo.png'
import { NotificationBadge } from '../notification/components/NotificationBadge'
import { useNotificationUnread } from '../notification/hooks/useNotificationUnread'
import type { UserPage } from '../routes'

interface DesktopHeaderProps {
  loggedIn: boolean
  canLogout: boolean
  memberName: string | null
  scrolled: boolean
  page: UserPage
}

const mainNav = [
  { page: 'ai', label: 'AI 채팅' },
  { page: 'stores', label: '매장 정보' },
  { page: 'store', label: '상품 정보' },
  { page: 'notices', label: '공지/장애 안내' },
  { page: 'customer', label: '고객센터' },
] as const

export function DesktopHeader({ canLogout, loggedIn, memberName, scrolled, page }: DesktopHeaderProps) {
  const { unreadCount } = useNotificationUnread()
  const isLoggedIn = loggedIn || Boolean(memberName)

  return (
    <header className={`desktop-header simple-header${scrolled ? ' scrolled' : ''}`}>
      <div className="global-nav">
        <button className="utility-brand" data-route="ai" aria-label="U봇 AI 채팅 홈" type="button">
          <img src={logo} alt="U봇" />
        </button>
        <nav className="gnb" aria-label="주요 메뉴">
          {mainNav.map(({ page: navPage, label }) => (
            <div className="gnb-item" key={navPage}>
              <button
                aria-current={page === navPage ? 'page' : undefined}
                className={page === navPage ? 'active' : undefined}
                data-route={navPage}
                type="button"
              >
                {label}
              </button>
            </div>
          ))}
        </nav>
        <div className="header-tools">
          <button className="header-action" data-route="stores" aria-label="매장찾기" type="button">
            <span className="header-action-icon" aria-hidden="true">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <path
                  d="M20 35 C20 35 30 26 30 17.5 C30 12 25.5 8 20 8 C14.5 8 10 12 10 17.5 C10 26 20 35 20 35Z"
                  stroke="#222"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <path d="M15 17H25 L24 14H16 L15 17Z" stroke="#222" strokeWidth="1.7" strokeLinejoin="round" />
                <path d="M16 17V23H24V17" stroke="#222" strokeWidth="1.7" strokeLinejoin="round" />
                <path d="M19 23V20H21V23" stroke="#222" strokeWidth="1.7" strokeLinejoin="round" />
              </svg>
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
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <circle cx="20" cy="13" r="5.5" stroke="#222" strokeWidth="2" />
                <path
                  d="M10 31 C10 25.5 14.5 22 20 22 C25.5 22 30 25.5 30 31"
                  stroke="#222"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              {isLoggedIn && <NotificationBadge className="notif-badge--icon" count={unreadCount} />}
            </span>
            <span className="header-action-label">{memberName ? `${memberName}님` : isLoggedIn ? '내 정보' : '로그인'}</span>
          </button>
          {canLogout && (
            <LogoutButton className="header-action" redirectTo={null}>
              <span className="header-action-icon" aria-hidden="true">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                  <path d="M18 11H12V29H18" stroke="#222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M22 15L27 20L22 25" stroke="#222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M17 20H27" stroke="#222" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </span>
              <span className="header-action-label">로그아웃</span>
            </LogoutButton>
          )}
        </div>
      </div>
    </header>
  )
}
