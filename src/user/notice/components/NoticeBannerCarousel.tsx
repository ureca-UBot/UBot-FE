import { useEffect, useRef, useState, type CSSProperties } from 'react'
import {
  NOTICE_REGION_LABELS,
  NOTICE_TYPE_LABELS,
  type Notice,
  type NoticeType,
} from '../../../shared/types/notice'

interface NoticeBannerCarouselProps {
  type: NoticeType
  // 한 개 이상일 때만 그려집니다. 여러 개면 화살표로 넘겨 봅니다.
  notices: Notice[]
  // 공지 목록 화면으로 가는 링크를 보여줄지 정합니다. 이미 목록 화면이면 숨깁니다.
  showAllLink: boolean
  // 접속 지역 표시입니다. 없으면(null) 그리지 않습니다.
  regionLabel: string | null
  onClose: () => void
}

interface NoticeContentStyle extends CSSProperties {
  '--notice-scroll-distance': string
}

function NoticeBannerContent({ content }: { content: string }) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)
  const [overflow, setOverflow] = useState(0)

  useEffect(() => {
    const viewport = viewportRef.current
    const text = textRef.current
    if (!viewport || !text) return
    const observer = new ResizeObserver(() => {
      setOverflow(Math.max(0, text.scrollWidth - viewport.clientWidth))
    })
    observer.observe(viewport)
    observer.observe(text)
    return () => observer.disconnect()
  }, [content])

  const style: NoticeContentStyle = {
    '--notice-scroll-distance': `${-overflow}px`,
    animationDuration: `${Math.max(8, overflow / 28 + 4)}s`,
  }

  return (
    <div
      ref={viewportRef}
      className={`notice-banner__content${overflow > 0 ? ' notice-banner__content--scrolling' : ''}`}
      tabIndex={overflow > 0 ? 0 : undefined}
      title={content}
    >
      <span ref={textRef} className="notice-banner__content-text" style={style}>
        {content}
      </span>
    </div>
  )
}

export function NoticeBannerCarousel({
  type,
  notices,
  showAllLink,
  regionLabel,
  onClose,
}: NoticeBannerCarouselProps) {
  const [index, setIndex] = useState(0)
  const label = NOTICE_TYPE_LABELS[type]
  const current = notices[Math.min(index, notices.length - 1)]
  const hasMany = notices.length > 1

  function move(step: number) {
    setIndex((value) => (value + step + notices.length) % notices.length)
  }

  return (
    <section
      aria-label={`${label} 안내`}
      className={`notice-banner notice-banner--${type === 'OUTAGE' ? 'outage' : 'notice'}`}
    >
      <div className="notice-banner__inner">
        <div className="notice-banner__header">
          <span className="notice-banner__badge">
            {label}
            {current.targetRegion && ` · ${NOTICE_REGION_LABELS[current.targetRegion]}`}
          </span>
          <strong className="notice-banner__title" title={current.title} aria-live="polite">
            {current.title}
          </strong>
          {hasMany && (
            <div className="notice-banner__carousel">
              <button
                aria-label={`이전 ${label}`}
                className="notice-banner__arrow"
                onClick={() => move(-1)}
                type="button"
              >
                ‹
              </button>
              <span className="notice-banner__count">
                {Math.min(index, notices.length - 1) + 1}/{notices.length}
              </span>
              <button
                aria-label={`다음 ${label}`}
                className="notice-banner__arrow"
                onClick={() => move(1)}
                type="button"
              >
                ›
              </button>
            </div>
          )}
          <div className="notice-banner__actions">
            {showAllLink && (
              <button className="notice-banner__all" data-route="notices" type="button">
                전체 보기
              </button>
            )}
            <button
              aria-label={`${label} 안내 닫기`}
              className="notice-banner__close"
              onClick={onClose}
              type="button"
            >
              ×
            </button>
          </div>
        </div>
        <div className="notice-banner__footer">
          <div aria-live="polite" className="notice-banner__body">
            <NoticeBannerContent key={current.noticeId} content={current.content} />
          </div>
          {regionLabel && (
            <span
              className="notice-banner__region"
              title="접속 IP로 확인한 지역이에요. 이 지역의 공지가 함께 보여요."
            >
              접속 지역 {regionLabel}
            </span>
          )}
        </div>
      </div>
    </section>
  )
}
