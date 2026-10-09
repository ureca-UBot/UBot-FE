import { apiClient } from '../../../shared/api/client'
import type { PageResponse } from '../../../shared/types/api'
import type { AddonService, BundleProduct, PlanDetail, RoamingProduct } from '../../../user/product/types/product'
import type {
  AddonServiceCreateRequest,
  AddonServiceUpdateRequest,
  AdminProduct,
  AdminProductListParams,
  BundleProductCreateRequest,
  BundleProductUpdateRequest,
  MasterStatus,
  PlanCreateRequest,
  PlanUpdateRequest,
  RoamingProductCreateRequest,
  RoamingProductUpdateRequest,
} from '../types/product'

export interface AdminProductApi<TDetail, TCreate, TUpdate> {
  getProductList: (params: AdminProductListParams) => Promise<PageResponse<AdminProduct<TDetail>>>
  getProduct: (id: number) => Promise<AdminProduct<TDetail>>
  createProduct: (body: TCreate) => Promise<AdminProduct<TDetail>>
  updateProduct: (id: number, body: TUpdate) => Promise<AdminProduct<TDetail>>
  updateProductStatus: (id: number, status: MasterStatus) => Promise<AdminProduct<TDetail>>
  deleteProduct: (id: number) => Promise<void>
}

// 관리자 상품 API는 4종 모두 경로와 동작이 같고 본문 모양만 다릅니다.
function createAdminProductApi<TDetail, TCreate, TUpdate>(basePath: string): AdminProductApi<TDetail, TCreate, TUpdate> {
  return {
    getProductList: ({ keyword, status, deleted, page, size }) => {
      const searchParams = new URLSearchParams({ deleted: String(deleted), page: String(page), size: String(size) })
      if (keyword.trim()) searchParams.set('keyword', keyword.trim())
      if (status) searchParams.set('status', status)
      return apiClient.get<PageResponse<AdminProduct<TDetail>>>(`${basePath}?${searchParams.toString()}`)
    },
    getProduct: (id) => apiClient.get<AdminProduct<TDetail>>(`${basePath}/${id}`),
    createProduct: (body) => apiClient.post<AdminProduct<TDetail>>(basePath, body),
    // 수정은 PATCH가 아니라 PUT입니다. 본문에 모든 필드를 담아 보냅니다.
    updateProduct: (id, body) => apiClient.put<AdminProduct<TDetail>>(`${basePath}/${id}`, body),
    updateProductStatus: (id, status) => apiClient.patch<AdminProduct<TDetail>>(`${basePath}/${id}/status`, { status }),
    deleteProduct: (id) => apiClient.delete<void>(`${basePath}/${id}`),
  }
}

export const adminPlanApi =
  createAdminProductApi<PlanDetail, PlanCreateRequest, PlanUpdateRequest>('/api/admin/plans')
export const adminBundleProductApi =
  createAdminProductApi<BundleProduct, BundleProductCreateRequest, BundleProductUpdateRequest>('/api/admin/bundle-products')
export const adminAddonServiceApi =
  createAdminProductApi<AddonService, AddonServiceCreateRequest, AddonServiceUpdateRequest>('/api/admin/addon-services')
export const adminRoamingProductApi =
  createAdminProductApi<RoamingProduct, RoamingProductCreateRequest, RoamingProductUpdateRequest>('/api/admin/roaming-products')
