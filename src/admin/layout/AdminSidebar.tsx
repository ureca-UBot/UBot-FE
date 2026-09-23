import { NavLink } from 'react-router-dom'

const menuItems = [
  { label: '대시보드', to: '/admin/dashboard' },
  { label: 'FAQ 관리', to: '/admin/faqs' },
  { label: '매장 관리', to: '/admin/stores' },
]

export function AdminSidebar() {
  return (
    <aside className="admin-sidebar">
      <p className="admin-logo">U<span>Bot</span> Admin</p>
      <nav className="admin-navigation" aria-label="관리자 메뉴">
        <p className="admin-navigation__label">콘텐츠 관리</p>
        {menuItems.map(({ label, to }) => (
          to ? (
            <NavLink className={({ isActive }) => `admin-navigation__item${isActive ? ' admin-navigation__item--active' : ''}`} key={label} to={to}>
              {label}
            </NavLink>
          ) : (
            <span aria-disabled="true" className="admin-navigation__item admin-navigation__item--disabled" key={label}>
              {label}<small>준비 중</small>
            </span>
          )
        ))}
      </nav>
    </aside>
  )
}
