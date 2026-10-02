import { apiClient } from '../../../shared/api/client'
import type { PageResponse } from '../../../shared/types/api'
import type {
  UnansweredGroupDetailResponse,
  UnansweredGroupFaqCreateRequest,
  UnansweredGroupListParams,
  UnansweredGroupResponse,
  UnansweredGroupStatusUpdateRequest,
} from '../types/unanswered'

const BASE_PATH = '/api/admin/unanswered-groups'

export const adminUnansweredApi = {
  getUnansweredGroupList: ({ status, minCount, sort, page, size }: UnansweredGroupListParams) => {
    const searchParams = new URLSearchParams({ minCount: String(minCount), sort, page: String(page), size: String(size) })
    if (status) searchParams.set('status', status)
    return apiClient.get<PageResponse<UnansweredGroupResponse>>(`${BASE_PATH}?${searchParams.toString()}`)
  },
  getUnansweredGroup: (groupId: number) =>
    apiClient.get<UnansweredGroupDetailResponse>(`${BASE_PATH}/${groupId}`),
  updateUnansweredGroupStatus: (groupId: number, body: UnansweredGroupStatusUpdateRequest) =>
    apiClient.patch<UnansweredGroupResponse>(`${BASE_PATH}/${groupId}/status`, body),
  createUnansweredGroupFaq: (groupId: number, body: UnansweredGroupFaqCreateRequest) =>
    apiClient.post<UnansweredGroupResponse>(`${BASE_PATH}/${groupId}/faq`, body),
}
