import { useState } from 'react'
import { useNoticeBanners } from '../hooks/useNoticeBanners'
import { NoticeBannerCarousel } from './NoticeBannerCarousel'

interface NoticeBannersProps {
    // 지금 공지 목록 화면인지 여부입니다. 목록 화면에서는 "전체 보기" 링크를 숨깁니다.
    onNoticePage: boolean
}

// 접속했을 때 공지·장애 배너를 보여줍니다. 장애를 먼저 보여주고, 둘 다 없으면 아무것도 그리지 않습니다.
export function NoticeBanners({ onNoticePage }: NoticeBannersProps) {
    const { notices, outages } = useNoticeBanners()
    const [outageClosed, setOutageClosed] = useState(false)
    const [noticeClosed, setNoticeClosed] = useState(false)

    const showOutages = outages.length > 0 && !outageClosed
    const showNotices = notices.length > 0 && !noticeClosed
    if (!showOutages && !showNotices) return null

    return (
        <div className="notice-banners">
            {showOutages && (
                <NoticeBannerCarousel notices={outages} onClose={() => setOutageClosed(true)} showAllLink={!onNoticePage} type="OUTAGE" />
            )}
            {showNotices && (
                <NoticeBannerCarousel notices={notices} onClose={() => setNoticeClosed(true)} showAllLink={!onNoticePage} type="NOTICE" />
            )}
        </div>
    )
}