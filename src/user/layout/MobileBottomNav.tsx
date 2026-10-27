import type { UserPage } from '../routes'

interface MobileBottomNavProps {
  page: UserPage
}

const items = [
  {
    page: 'store',
    label: '상품 정보',
    icon: (
      <>
        <rect x="6" y="2" width="12" height="20" rx="2.5" />
        <path d="M10 5h4m-3 14h2" />
      </>
    ),
  },
  {
    page: 'stores',
    label: '매장 정보',
    icon: (
      <>
        <path d="m3 10 2-6h14l2 6M4 13v7h16v-7" />
        <path d="M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M9 20v-6h6v6" />
      </>
    ),
  },
  {
    page: 'ai',
    label: 'AI 채팅',
    icon: (
      <>
        <path d="M13 4H6a3 3 0 0 0-3 3v14l6-3h9a3 3 0 0 0 3-3v-3" />
        <path d="m18 2 1.1 3.9L23 7l-3.9 1.1L18 12l-1.1-3.9L13 7l3.9-1.1Z" />
        <path d="M7 10h3m-3 4h8" />
      </>
    ),
  },
  {
    page: 'notices',
    label: '공지/장애',
    icon: <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />,
  },
  {
    page: 'customer',
    label: '고객센터',
    icon: (
      <>
        <path d="M4 13v-1a8 8 0 0 1 16 0v5a4 4 0 0 1-4 4h-3" />
        <rect x="3" y="11" width="4" height="7" rx="2" />
        <rect x="17" y="11" width="4" height="7" rx="2" />
      </>
    ),
  },
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
          <span className="bottom-nav-icon" aria-hidden="true">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              focusable="false"
            >
              {icon}
            </svg>
          </span>
          <b>{label}</b>
        </button>
      ))}
    </nav>
  )
}
