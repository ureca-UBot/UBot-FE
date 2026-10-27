import { apiClient } from '../../../shared/api/client'
import type {
  ChatProductAvailability,
  ChatProductSearchRequest,
  ChatProductSearchResponse,
} from '../types/chat'

const pendingOptions = new Map<string, Promise<ChatProductAvailability>>()
const pendingSearches = new Map<string, Promise<ChatProductSearchResponse>>()
function sharedRequest<T>(
  pending: Map<string, Promise<T>>,
  request: unknown,
  send: () => Promise<T>,
) {
  const key = JSON.stringify(request)
  const existing = pending.get(key)
  if (existing) return existing
  const result = send().finally(() => {
    if (pending.get(key) === result) pending.delete(key)
  })
  pending.set(key, result)
  return result
}

// 두 채팅창이 같은 조건을 동시에 확인할 때 진행 중인 공개 조회만 공유합니다.
// 완료된 선택지는 캐시하지 않아 조건을 바꿀 때마다 DB의 현재 가능 여부를 확인합니다.
export const productSearchApi = {
  options: (request: ChatProductSearchRequest & { key: string }) =>
    sharedRequest(pendingOptions, request, () =>
      apiClient.post<ChatProductAvailability>('/api/chat/product-search/options', request, false),
    ),
  search: (request: ChatProductSearchRequest) =>
    sharedRequest(pendingSearches, request, () =>
      apiClient.post<ChatProductSearchResponse>('/api/chat/product-search', request, false),
    ),
}
