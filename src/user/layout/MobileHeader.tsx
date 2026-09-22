import logo from '../assets/ubot-logo.png'

interface MobileHeaderProps {
  title: string;
}

export function MobileHeader({ title }: MobileHeaderProps) {
  return (
    <>
  <header className="mobile-header">
    <div className="mobile-title-wrap"><img className="mobile-brand-logo" src={logo} alt="" /><strong className="mobile-brand-name">U봇</strong><span id="mobileTitle" className="sr-only-title">{title}</span></div>
    <div className="mobile-actions"><button className="mobile-icon-btn notification-btn" aria-label="알림"><span aria-hidden="true"></span></button><button id="mobileDemoOpen" className="mobile-icon-btn mobile-more-btn" aria-label="시연 메뉴">•••</button></div>
  </header>
    </>
  );
}
