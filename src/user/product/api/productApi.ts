import { apiClient } from '../../../shared/api/client'
import type { PageResponse } from '../../../shared/types/api'
import type { AddonService, BundleProduct, PlanDetail, PlanSummary, RoamingProduct } from '../types/product'

export interface ProductListParams {
  keyword?: string
  page?: number
  size?: number
}

export interface RoamingProductListParams extends ProductListParams {
  // 백엔드는 국가 이름이 정확히 같은 상품만 돌려줍니다(부분 일치가 아닙니다).
  country?: string
}

function listQuery({ keyword, page = 0, size = 20 }: ProductListParams) {
  const searchParams = new URLSearchParams({ page: String(page), size: String(size) })
  if (keyword?.trim()) searchParams.set('keyword', keyword.trim())
  return searchParams
}

// 로그인 없이 조회할 수 있습니다. 활성 상태이고 삭제되지 않은 상품만 내려옵니다.
export const productApi = {
  getPlanList: (params: ProductListParams = {}) =>
    apiClient.get<PageResponse<PlanSummary>>(`/api/plans?${listQuery(params).toString()}`),
  getPlan: (planId: number) => apiClient.get<PlanDetail>(`/api/plans/${planId}`),

  getBundleProductList: (params: ProductListParams = {}) =>
    apiClient.get<PageResponse<BundleProduct>>(`/api/bundle-products?${listQuery(params).toString()}`),
  getBundleProduct: (bundleProductId: number) =>
    apiClient.get<BundleProduct>(`/api/bundle-products/${bundleProductId}`),

  getAddonServiceList: (params: ProductListParams = {}) =>
    apiClient.get<PageResponse<AddonService>>(`/api/addon-services?${listQuery(params).toString()}`),
  getAddonService: (addonServiceId: number) =>
    apiClient.get<AddonService>(`/api/addon-services/${addonServiceId}`),

  getRoamingProductList: ({ country, ...params }: RoamingProductListParams = {}) => {
    const searchParams = listQuery(params)
    if (country?.trim()) searchParams.set('country', country.trim())
    return apiClient.get<PageResponse<RoamingProduct>>(`/api/roaming-products?${searchParams.toString()}`)
  },
  getRoamingProduct: (roamingProductId: number) =>
    apiClient.get<RoamingProduct>(`/api/roaming-products/${roamingProductId}`),
}
