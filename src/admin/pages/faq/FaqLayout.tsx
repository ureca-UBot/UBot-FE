import { NavLink, Outlet } from 'react-router-dom'
import { FaqCategoryProvider } from '../../faq/context/FaqCategoryProvider'
import { useFaqCategories } from '../../faq/hooks/useFaqCategories'

const tabs = [
  ['전체 FAQ', '/admin/faqs'],
  ['삭제된 FAQ', '/admin/faqs/deleted'],
  ['카테고리 관리', '/admin/faqs/categories'],
]

function CategoryLoadError() {
  const { error, refreshCategories } = useFaqCategories()
  if (!error) return null
  return (
    <p className="page-message page-message--error" role="alert">
      {error}{' '}
      <button className="secondary-button" type="button" onClick={() => void refreshCategories()}>
        카테고리 다시 시도
      </button>
    </p>
  )
}

export function FaqLayout() {
  return (
    <FaqCategoryProvider>
      <section>
        <nav className="faq-tabs">
          {tabs.map(([label, to]) => (
            <NavLink
              className={({ isActive }) => `faq-tab${isActive ? ' faq-tab--active' : ''}`}
              end={to === '/admin/faqs'}
              key={to}
              to={to}
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <CategoryLoadError />
        <Outlet />
      </section>
    </FaqCategoryProvider>
  )
}
