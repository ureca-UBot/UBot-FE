import { useState } from 'react'
import { NOTICE_REGION_LABELS, NOTICE_TYPE_LABELS, type Notice, type NoticeType } from '../../../shared/types/notice'

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

export function NoticeBannerCarousel({ type, notices, showAllLink, regionLabel, onClose }: NoticeBannerCarouselProps) {
    const [index, setIndex] = useState(0)
    const [expanded, setExpanded] = useState(false)
    const label = NOTICE_TYPE_LABELS[type]
    const current = notices[Math.min(index, notices.length - 1)]
    const hasMany = notices.length > 1

    function move(step: number) {
        setIndex((value) => (value + step + notices.length) % notices.length)
        setExpanded(false)
    }

    return (
        <section
            aria-label={`${label} 안내`}
            className={`notice-banner notice-banner--${type === 'OUTAGE' ? 'outage' : 'notice'}`}
        >
            <div className="notice-banner__inner">
                <span className="notice-banner__badge">
                    {label}{current.targetRegion && ` · ${NOTICE_REGION_LABELS[current.targetRegion]}`}
                </span>

                {hasMany && (
                    <button aria-label={`이전 ${label}`} className="notice-banner__arrow" onClick={() => move(-1)} type="button">‹</button>
                )}

                <div aria-live="polite" className="notice-banner__body">
                    <strong className="notice-banner__title">{current.title}</strong>
                    <span className={expanded ? 'notice-banner__content notice-banner__content--open' : 'notice-banner__content'}>
                        {current.content}
                    </span>
                </div>

                {hasMany && (
                    <>
                        <button aria-label={`다음 ${label}`} className="notice-banner__arrow" onClick={() => move(1)} type="button">›</button>
                        <span className="notice-banner__count">{Math.min(index, notices.length - 1) + 1}/{notices.length}</span>
                    </>
                )}

                {regionLabel && (
                    <span className="notice-banner__region" title="접속 IP로 확인한 지역이에요. 이 지역의 공지가 함께 보여요.">
                        접속 지역 {regionLabel}
                    </span>
                )}

                {showAllLink && <button className="notice-banner__all" data-route="notices" type="button">전체 보기</button>}
                <button
                    aria-expanded={expanded}
                    className="notice-banner__toggle"
                    onClick={() => setExpanded((value) => !value)}
                    type="button"
                >
                    {expanded ? '접기' : '자세히'}
                </button>
                <button aria-label={`${label} 안내 닫기`} className="notice-banner__close" onClick={onClose} type="button">×</button>
            </div>
        </section>
    )
}