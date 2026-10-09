import { NavLink, Outlet } from 'react-router-dom'

const tabs = [
  ['요금제', '/admin/products/plans'],
  ['결합상품', '/admin/products/bundle-products'],
  ['부가서비스', '/admin/products/addon-services'],
  ['로밍', '/admin/products/roaming-products'],
]

export function ProductLayout() {
  return (
    <section>
      <nav aria-label="상품 종류" className="faq-tabs">
        {tabs.map(([label, to]) => (
          <NavLink className={({ isActive }) => `faq-tab${isActive ? ' faq-tab--active' : ''}`} key={to} to={to}>{label}</NavLink>
        ))}
      </nav>
      <Outlet />
    </section>
  )
}
