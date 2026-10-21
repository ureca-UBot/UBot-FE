import type { UserPage } from '../routes'

interface MobileBottomNavProps {
  page: UserPage
}

const items = [
  { page: 'ai', label: 'AI 채팅', icon: '✦' },
  { page: 'stores', label: '매장 정보', icon: '⌖' },
  { page: 'store', label: '상품 정보', icon: '▦' },
  { page: 'notices', label: '공지/장애', icon: '◉' },
  { page: 'customer', label: '고객센터', icon: '☏' },
] as const

export function MobileBottomNav({ page }: MobileBottomNavProps) {
  return (
    <nav className="mobile-only bottom-nav" aria-label="주요 메뉴">
      {items.map(({ page: navPage, label, icon }) => (
        <button
          aria-current={page === navPage ? 'page' : undefined}
          className={page === navPage ? 'active' : undefined}
          data-route={navPage}
          key={navPage}
          type="button"
        >
          <span aria-hidden="true">{icon}</span>
          <b>{label}</b>
        </button>
      ))}
    </nav>
  )
}
