import { apiClient } from '../../../shared/api/client'
import type { PageResponse } from '../../../shared/types/api'
import type { AdminStore, StoreDetail, StoreFormValues, StoreListItem, StoreListParams } from '../types/store'

function listQuery({ sido, sigungu, serviceCodes = [], page = 0, size = 20 }: StoreListParams) {
  const query = new URLSearchParams({ page: String(page), size: String(size) })
  if (sido) query.set('sido', sido)
  if (sigungu) query.set('sigungu', sigungu)
  serviceCodes.forEach((code) => query.append('type', code))
  return query.toString()
}

function requestBody({ sido, sigungu, phoneNumber, businessHours, ...required }: StoreFormValues) {
  const optional = (value: string) => value.trim() || undefined
  return { ...required, sido: optional(sido), sigungu: optional(sigungu), phoneNumber: optional(phoneNumber), businessHours: optional(businessHours) }
}

// BE feat/29-admin-store-api: 조회는 /stores, 관리 변경은 /admin/stores를 사용합니다.
export const adminStoreApi = {
  getStores: (params: StoreListParams = {}) => apiClient.get<PageResponse<StoreListItem>>(`/stores?${listQuery(params)}`),
  getStore: (storeId: number) => apiClient.get<StoreDetail>(`/stores/${storeId}`),
  getSidos: () => apiClient.get<string[]>('/stores/regions/sidos'),
  getSigungus: (sido: string) => apiClient.get<string[]>(`/stores/regions/sigungus?sido=${encodeURIComponent(sido)}`),
  createStore: (body: StoreFormValues) => apiClient.post<AdminStore>('/admin/stores', requestBody(body)),
  updateStore: (storeId: number, body: StoreFormValues) => apiClient.patch<AdminStore>(`/admin/stores/${storeId}`, requestBody(body)),
  deleteStore: (storeId: number) => apiClient.delete<void>(`/admin/stores/${storeId}`),
  activateStore: (storeId: number) => apiClient.patch<AdminStore>(`/admin/stores/${storeId}/activate`, {}),
}
