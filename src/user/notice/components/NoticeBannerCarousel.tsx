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

interface NoticeBannerViewProps extends Omit<NoticeBannerCarouselProps, 'notices'> {
  current: Notice
  index: number
  total: number
  move: (step: number) => void
}

interface NoticeContentStyle extends CSSProperties {
  '--notice-scroll-distance': string
}

const MOBILE_QUERY = '(max-width: 767px)'

// PC와 모바일은 배너 구성이 달라서 화면 폭에 맞는 마크업 하나만 그립니다.
function useMobileBanner() {
  const [mobile, setMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches)

  useEffect(() => {
    const query = window.matchMedia(MOBILE_QUERY)
    const update = () => setMobile(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  return mobile
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

// PC: 한 줄에 배치하고 본문은 자세히 버튼으로 펼칩니다.
function DesktopNoticeBanner({
  type,
  current,
  index,
  total,
  move,
  showAllLink,
  regionLabel,
  onClose,
  expanded,
  onToggle,
}: NoticeBannerViewProps & { expanded: boolean; onToggle: () => void }) {
  const label = NOTICE_TYPE_LABELS[type]
  const hasMany = total > 1

  return (
    <div className="notice-banner__inner">
      <span className="notice-banner__badge">
        {label}
        {current.targetRegion && ` · ${NOTICE_REGION_LABELS[current.targetRegion]}`}
      </span>

      {hasMany && (
        <button
          aria-label={`이전 ${label}`}
          className="notice-banner__arrow"
          onClick={() => move(-1)}
          type="button"
        >
          ‹
        </button>
      )}

      <div aria-live="polite" className="notice-banner__body">
        <strong className="notice-banner__title">{current.title}</strong>
        <span
          className={
            expanded
              ? 'notice-banner__content notice-banner__content--open'
              : 'notice-banner__content'
          }
        >
          {current.content}
        </span>
      </div>

      {hasMany && (
        <>
          <button
            aria-label={`다음 ${label}`}
            className="notice-banner__arrow"
            onClick={() => move(1)}
            type="button"
          >
            ›
          </button>
          <span className="notice-banner__count">
            {index + 1}/{total}
          </span>
        </>
      )}

      {regionLabel && (
        <span
          className="notice-banner__region"
          title="접속 IP로 확인한 지역이에요. 이 지역의 공지가 함께 보여요."
        >
          접속 지역 {regionLabel}
        </span>
      )}

      {showAllLink && (
        <button className="notice-banner__all" data-route="notices" type="button">
          전체 보기
        </button>
      )}
      <button
        aria-expanded={expanded}
        className="notice-banner__toggle"
        onClick={onToggle}
        type="button"
      >
        {expanded ? '접기' : '자세히'}
      </button>
      <button
        aria-label={`${label} 안내 닫기`}
        className="notice-banner__close"
        onClick={onClose}
        type="button"
      >
        ×
      </button>
    </div>
  )
}

// 모바일: 제목 줄과 본문 줄로 나누고, 긴 본문은 옆으로 흐르게 보여줍니다.
function MobileNoticeBanner({
  type,
  current,
  index,
  total,
  move,
  showAllLink,
  regionLabel,
  onClose,
}: NoticeBannerViewProps) {
  const label = NOTICE_TYPE_LABELS[type]

  return (
    <div className="notice-banner__inner">
      <div className="notice-banner__header">
        <span className="notice-banner__badge">
          {label}
          {current.targetRegion && ` · ${NOTICE_REGION_LABELS[current.targetRegion]}`}
        </span>
        <strong className="notice-banner__title" title={current.title} aria-live="polite">
          {current.title}
        </strong>
        {total > 1 && (
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
              {index + 1}/{total}
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
  )
}

export function NoticeBannerCarousel({
  type,
  notices,
  showAllLink,
  regionLabel,
  onClose,
}: NoticeBannerCarouselProps) {
  const mobile = useMobileBanner()
  const [index, setIndex] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const label = NOTICE_TYPE_LABELS[type]
  const currentIndex = Math.min(index, notices.length - 1)

  function move(step: number) {
    setIndex((value) => (value + step + notices.length) % notices.length)
    setExpanded(false)
  }

  const view: NoticeBannerViewProps = {
    type,
    current: notices[currentIndex],
    index: currentIndex,
    total: notices.length,
    move,
    showAllLink,
    regionLabel,
    onClose,
  }

  return (
    <section
      aria-label={`${label} 안내`}
      className={`notice-banner notice-banner--${type === 'OUTAGE' ? 'outage' : 'notice'} notice-banner--${mobile ? 'mobile' : 'pc'}`}
    >
      {mobile ? (
        <MobileNoticeBanner {...view} />
      ) : (
        <DesktopNoticeBanner
          {...view}
          expanded={expanded}
          onToggle={() => setExpanded((value) => !value)}
        />
      )}
    </section>
  )
}
