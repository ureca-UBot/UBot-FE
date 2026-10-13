import type { Notice, NoticeRegion, NoticeType } from '../../../shared/types/notice'

// BE NoticeBannerResponseDto: 없으면 빈 목록입니다. 최신순이고 종류별 최대 10개입니다.
export interface NoticeBanners {
    // 서버가 접속 IP로 판별한 지역입니다. 판별하지 못하면 null이고, 이때는 전체 공지만 내려옵니다.
    region: NoticeRegion | null
    notices: Notice[]
    outages: Notice[]
}

export interface NoticeListParams {
    type: NoticeType | null
    // 지정하면 전체 공지와 그 지역 공지만 내려옵니다. 지정하지 않으면 모든 지역의 공지가 내려옵니다.
    region: NoticeRegion | null
    page: number
    size: number
}