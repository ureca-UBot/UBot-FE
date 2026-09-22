import { NavLink, Outlet } from 'react-router-dom'
import { FaqCategoryProvider } from '../../faq/context/FaqCategoryProvider'

const tabs = [
  ['전체 FAQ', '/admin/faqs'],
  ['삭제된 FAQ', '/admin/faqs/deleted'],
  ['카테고리 관리', '/admin/faqs/categories'],
]

export function FaqLayout() {
  return <FaqCategoryProvider><section><nav className="faq-tabs">{tabs.map(([label, to]) => <NavLink className={({ isActive }) => `faq-tab${isActive ? ' faq-tab--active' : ''}`} end={to === '/admin/faqs'} key={to} to={to}>{label}</NavLink>)}</nav><Outlet /></section></FaqCategoryProvider>
}
