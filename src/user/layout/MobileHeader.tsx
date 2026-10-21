import logo from '../assets/ubot-logo.png'

interface MobileHeaderProps {
  title: string
}

export function MobileHeader({ title }: MobileHeaderProps) {
  return (
    <>
      <header className="mobile-header">
        <div className="mobile-title-wrap">
          <img className="mobile-brand-logo" src={logo} alt="" />
          <strong className="mobile-brand-name">U봇</strong>
          <span id="mobileTitle" className="sr-only-title">
            {title}
          </span>
        </div>
        <div className="mobile-actions">
          <button className="mobile-icon-btn" data-route="my" aria-label="내 정보" type="button">
            <svg width="32" height="32" viewBox="0 0 40 40" fill="none" aria-hidden="true">
              <circle cx="20" cy="13" r="5.5" stroke="currentColor" strokeWidth="2" />
              <path
                d="M10 31 C10 25.5 14.5 22 20 22 C25.5 22 30 25.5 30 31"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </header>
    </>
  )
}
