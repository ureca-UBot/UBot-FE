// BE NoticeType: NOTICE는 공지, OUTAGE는 통신 장애 안내입니다.
export type NoticeType = 'NOTICE' | 'OUTAGE'

// BE RegionSido: 공지 대상 시/도입니다. 값이 없으면(null) 전체 공지입니다.
export type NoticeRegion =
    | 'SEOUL' | 'BUSAN' | 'DAEGU' | 'INCHEON' | 'GWANGJU' | 'DAEJEON' | 'ULSAN' | 'SEJONG'
    | 'GYEONGGI' | 'GANGWON' | 'CHUNGBUK' | 'CHUNGNAM' | 'JEONBUK' | 'JEONNAM' | 'GYEONGBUK' | 'GYEONGNAM' | 'JEJU'

export const NOTICE_TYPE_LABELS: Record<NoticeType, string> = {
    NOTICE: '공지',
    OUTAGE: '장애',
}

export const NOTICE_REGION_LABELS: Record<NoticeRegion, string> = {
    SEOUL: '서울', BUSAN: '부산', DAEGU: '대구', INCHEON: '인천', GWANGJU: '광주', DAEJEON: '대전', ULSAN: '울산', SEJONG: '세종',
    GYEONGGI: '경기', GANGWON: '강원', CHUNGBUK: '충북', CHUNGNAM: '충남', JEONBUK: '전북', JEONNAM: '전남',
    GYEONGBUK: '경북', GYEONGNAM: '경남', JEJU: '제주',
}

export const NOTICE_REGIONS = Object.keys(NOTICE_REGION_LABELS) as NoticeRegion[]

// BE NoticeResponseDto: 공개 조회와 관리자 응답의 detail이 같은 모양입니다.
export interface Notice {
    noticeId: number
    type: NoticeType
    title: string
    content: string
    targetRegion: NoticeRegion | null
    // 배너 노출 종료 시각입니다. null이면 삭제하기 전까지 계속 노출합니다. 서버 시간대의 LocalDateTime입니다.
    endsAt: string | null
    createdAt: string
}

// BE NoticeSummaryResponseDto: 목록의 한 건입니다. 본문(content)은 상세 조회에서만 내려옵니다.
export type NoticeSummary = Omit<Notice, 'content'>

// 서버의 LocalDateTime("2026-10-20T18:00:00")을 "2026-10-20 18:00"으로 보여줍니다.
export function formatNoticeDateTime(value: string | null) {
    return value ? value.replace('T', ' ').slice(0, 16) : '-'
}

// "2026-10-20"처럼 날짜만 보여줍니다.
export function formatNoticeDate(value: string | null) {
    return value ? value.slice(0, 10) : '-'
}

// 노출 종료 시각이 지났는지 확인합니다. 종료 시각이 없으면 지나지 않은 것입니다.
export function isNoticeExpired(endsAt: string | null) {
    return endsAt !== null && new Date(endsAt).getTime() <= Date.now()
}