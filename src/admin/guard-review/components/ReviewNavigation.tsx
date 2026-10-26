import { Link } from 'react-router-dom'
import '../guard-review.css'

export type ReviewView = 'words' | 'candidates' | 'warnings' | 'settings' | 'history' | 'checks'

const items: { view: ReviewView; label: string; to: string }[] = [
  { view: 'words', label: '등록된 금지어', to: '/admin/forbidden-words' },
  { view: 'candidates', label: '금칙어 후보', to: '/admin/forbidden-words/review?view=candidates' },
  { view: 'warnings', label: '위험 문장 경고', to: '/admin/forbidden-words/review?view=warnings' },
  { view: 'checks', label: '가드 검사 기록', to: '/admin/forbidden-words/review?view=checks' },
  { view: 'settings', label: '분석 설정', to: '/admin/forbidden-words/review?view=settings' },
  { view: 'history', label: '적용 이력', to: '/admin/forbidden-words/review?view=history' },
]

export function ReviewNavigation({ active }: { active: ReviewView }) {
  return (
    <nav className="review-navigation" aria-label="금지어·AI 검토 메뉴">
      {items.map(({ view, label, to }) => (
        <Link key={view} to={to} aria-current={active === view ? 'page' : undefined}>
          {label}
        </Link>
      ))}
    </nav>
  )
}
