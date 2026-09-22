import type { UserPage } from '../routes'

interface MobileBottomNavProps {
  page: UserPage
}

export function MobileBottomNav({ page }: MobileBottomNavProps) {
  return (
    <>
  <nav className="mobile-only bottom-nav">
    <button className={page === 'home' ? 'active' : ''} data-route="home"><span>⌂</span><b>홈</b></button>
    <button className={page === 'store' ? 'active' : ''} data-route="store"><span>▦</span><b>스토어</b></button>
    <button className={page === 'benefits' ? 'active' : ''} data-route="benefits"><span>♡</span><b>혜택</b></button>
    <button className={page === 'support' ? 'active' : ''} data-route="support"><span>◉</span><b>통신</b></button>
    <button className={page === 'ai' ? 'active' : ''} data-route="ai"><span>✦</span><b>AI 검색</b></button>
  </nav>
    </>
  );
}
