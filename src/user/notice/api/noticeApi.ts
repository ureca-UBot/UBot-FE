import { apiClient } from '../../../shared/api/client'
import type { PageResponse } from '../../../shared/types/api'
import type { Notice, NoticeSummary } from '../../../shared/types/notice'
import type { NoticeBanners, NoticeListParams } from '../types/notice'

// 공지 조회는 모두 비회원도 볼 수 있는 공개 API입니다.
// 로그인 여부와 상관없이 같은 결과를 내려주므로 토큰은 보내지 않습니다.
export const noticeApi = {
  // 서버가 요청 IP로 지역을 판단해 전체 공지와 그 지역 공지를 함께 내려줍니다.
  getBanners: () => apiClient.get<NoticeBanners>('/api/notices/banners', undefined, false),

  // 노출이 끝난 공지도 이력으로 포함하며 최신순입니다. 삭제된 공지는 없습니다.
  getNoticeList: ({ type, region, page, size }: NoticeListParams) => {
    const searchParams = new URLSearchParams({ page: String(page), size: String(size) })
    if (type) searchParams.set('type', type)
    if (region) searchParams.set('region', region)
    return apiClient.get<PageResponse<NoticeSummary>>(
      `/api/notices?${searchParams.toString()}`,
      undefined,
      false,
    )
  },

  // 없거나 삭제된 공지는 NOTICE-001(404)입니다.
  getNotice: (noticeId: number) =>
    apiClient.get<Notice>(`/api/notices/${noticeId}`, undefined, false),
}
