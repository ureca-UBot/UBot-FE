import { apiClient } from '../../../shared/api/client'
import type { PageResponse } from '../../../shared/types/api'
import type { AdminNotice, AdminNoticeListParams, AdminNoticeRequest } from '../types/notice'

const BASE_PATH = '/api/admin/notices'

export const adminNoticeApi = {
  getNoticeList: ({ type, region, deleted, page, size }: AdminNoticeListParams) => {
    const searchParams = new URLSearchParams({
      deleted: String(deleted),
      page: String(page),
      size: String(size),
    })
    if (type) searchParams.set('type', type)
    if (region) searchParams.set('region', region)
    return apiClient.get<PageResponse<AdminNotice>>(`${BASE_PATH}?${searchParams.toString()}`)
  },
  // 삭제된 공지도 조회할 수 있습니다.
  getNotice: (noticeId: number) => apiClient.get<AdminNotice>(`${BASE_PATH}/${noticeId}`),
  createNotice: (body: AdminNoticeRequest) => apiClient.post<AdminNotice>(BASE_PATH, body),
  // 수정은 PATCH가 아니라 PUT입니다. 본문에 모든 필드를 담아 보냅니다.
  updateNotice: (noticeId: number, body: AdminNoticeRequest) =>
    apiClient.put<AdminNotice>(`${BASE_PATH}/${noticeId}`, body),
  deleteNotice: (noticeId: number) => apiClient.delete<void>(`${BASE_PATH}/${noticeId}`),
}
