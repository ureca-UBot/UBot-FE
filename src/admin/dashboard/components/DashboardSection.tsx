import { useEffect, useId, useState, type ReactNode } from 'react'
import { useModalFocus } from '../../../shared/hooks/useModalFocus'

export function DashboardSection({
  kind,
  number,
  title,
  actions,
  children,
}: {
  kind: 'unanswered' | 'usage' | 'similarity' | 'detail' | 'improvement'
  number: string
  title: string
  actions?: ReactNode
  children: ReactNode
}) {
  const [expanded, setExpanded] = useState(false)
  const headingId = useId()
  const ref = useModalFocus<HTMLElement>(() => setExpanded(false), expanded)
  useEffect(() => {
    if (!expanded) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [expanded])
  return (
    <>
      {expanded && <div className="faq-dashboard-expand-backdrop" aria-hidden="true" />}
      <section
        ref={ref}
        className={`faq-dashboard-section faq-dashboard-section--${kind}${expanded ? ' is-expanded' : ''}`}
        role={expanded ? 'dialog' : undefined}
        aria-modal={expanded || undefined}
        aria-labelledby={headingId}
      >
        <div className="faq-dashboard-section__title">
          <span className="faq-dashboard-section__number">{number}</span>
          <h2 id={headingId}>{title}</h2>
          {actions}
          <button
            className="faq-dashboard-expand"
            type="button"
            aria-label={`${title} ${expanded ? '확대 닫기' : '전체화면'}`}
            aria-expanded={expanded}
            onClick={() => setExpanded((current) => !current)}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              aria-hidden="true"
            >
              <path
                d={
                  expanded
                    ? 'M4 9h5V4m6 0v5h5M4 15h5v5m6 0v-5h5'
                    : 'M9 4H4v5m11-5h5v5M4 15v5h5m6 0h5v-5'
                }
              />
            </svg>
            <span>{expanded ? '축소' : '전체화면'}</span>
          </button>
        </div>
        {children}
      </section>
    </>
  )
}
