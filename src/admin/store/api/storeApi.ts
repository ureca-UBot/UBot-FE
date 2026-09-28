import { apiClient } from '../../../shared/api/client'
import type { PageResponse } from '../../../shared/types/api'
import type { AdminStore, StoreDetail, StoreFormValues, StoreListParams } from '../types/store'

function listQuery({
  storeName,
  phoneNumber,
  sido,
  sigungu,
  serviceCodes = [],
  page = 0,
  size = 20,
}: StoreListParams) {
  const query = new URLSearchParams({
    page: String(page),
    size: String(size),
  })

  if (storeName?.trim()) query.set('storeName', storeName.trim())
  if (phoneNumber?.trim()) query.set('phoneNumber', phoneNumber.trim())
  if (sido?.trim()) query.set('sido', sido.trim())
  if (sigungu?.trim()) query.set('sigungu', sigungu.trim())
  serviceCodes.forEach((code) => query.append('type', code))

  return query.toString()
}

function requestBody({
  sido,
  sigungu,
  phoneNumber,
  businessHours,
  ...required
}: StoreFormValues) {
  const optional = (value: string) => value.trim() || undefined

  return {
    ...required,
    sido: optional(sido),
    sigungu: optional(sigungu),
    phoneNumber: optional(phoneNumber),
    businessHours: optional(businessHours),
  }
}

export const adminStoreApi = {
  getStores: (params: StoreListParams = {}) =>
    apiClient.get<PageResponse<AdminStore>>(
      `/api/admin/stores?${listQuery(params)}`,
    ),
  getDeletedStores: (params: StoreListParams = {}) =>
    apiClient.get<PageResponse<AdminStore>>(
      `/api/admin/stores/deleted?${listQuery(params)}`,
    ),
  getStore: (storeId: number) =>
    apiClient.get<StoreDetail>(`/api/stores/${storeId}`),
  getSidos: () => apiClient.get<string[]>('/api/stores/regions/sidos'),
  getSigungus: (sido: string) =>
    apiClient.get<string[]>(
      `/api/stores/regions/sigungus?sido=${encodeURIComponent(sido)}`,
    ),
  createStore: (body: StoreFormValues) =>
    apiClient.post<AdminStore>('/api/admin/stores', requestBody(body)),
  updateStore: (storeId: number, body: StoreFormValues) =>
    apiClient.patch<AdminStore>(
      `/api/admin/stores/${storeId}`,
      requestBody(body),
    ),
  deleteStore: (storeId: number) =>
    apiClient.delete<void>(`/api/admin/stores/${storeId}`),
  activateStore: (storeId: number) =>
    apiClient.patch<AdminStore>(
      `/api/admin/stores/${storeId}/activate`,
      {},
    ),
}
