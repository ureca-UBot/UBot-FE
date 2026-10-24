import { apiClient } from '../../../shared/api/client'
import type {
  AddonCategory,
  AddonService,
  BundleProduct,
  BundleType,
  HomeProduct,
  HomeProductType,
  PlanDetail,
  PlanSummary,
  RoamingProduct,
} from '../../../shared/product/types'
import type { PageResponse } from '../../../shared/types/api'

export interface ProductListParams {
  keyword?: string
  page?: number
  size?: number
}

export interface RoamingProductListParams extends ProductListParams {
  // 백엔드는 국가 이름이 정확히 같은 상품만 돌려줍니다(부분 일치가 아닙니다).
  country?: string
}

export interface BundleProductListParams extends ProductListParams {
  bundleType?: BundleType
}

export interface AddonServiceListParams extends ProductListParams {
  category?: AddonCategory
}

export interface HomeProductListParams extends ProductListParams {
  productType?: HomeProductType
}

function listQuery({ keyword, page = 0, size = 20 }: ProductListParams) {
  const searchParams = new URLSearchParams({ page: String(page), size: String(size) })
  if (keyword?.trim()) searchParams.set('keyword', keyword.trim())
  return searchParams
}

// 목록 조회에 선택 조건(국가·분류 등)을 붙입니다. 값이 없으면 조건 없이 조회합니다.
function listQueryWith(params: ProductListParams, name: string, value: string | undefined) {
  const searchParams = listQuery(params)
  if (value?.trim()) searchParams.set(name, value.trim())
  return searchParams
}

// 로그인 없이 조회할 수 있습니다. 활성 상태이고 삭제되지 않은 상품만 내려옵니다.
export const productApi = {
  getPlanList: (params: ProductListParams = {}) =>
    apiClient.get<PageResponse<PlanSummary>>(
      `/api/plans?${listQuery(params).toString()}`,
      undefined,
      false,
    ),
  getPlan: (planId: number) => apiClient.get<PlanDetail>(`/api/plans/${planId}`, undefined, false),
  // 요금제에 기본으로 포함된 부가서비스입니다. 요금제에 가입하면 0원으로 함께 가입됩니다.
  getPlanIncludedAddonList: (planId: number) =>
    apiClient.get<AddonService[]>(`/api/plans/${planId}/included-addons`, undefined, false),

  getBundleProductList: ({ bundleType, ...params }: BundleProductListParams = {}) =>
    apiClient.get<PageResponse<BundleProduct>>(
      `/api/bundle-products?${listQueryWith(params, 'bundleType', bundleType).toString()}`,
      undefined,
      false,
    ),
  getBundleProduct: (bundleProductId: number) =>
    apiClient.get<BundleProduct>(`/api/bundle-products/${bundleProductId}`, undefined, false),

  getAddonServiceList: ({ category, ...params }: AddonServiceListParams = {}) =>
    apiClient.get<PageResponse<AddonService>>(
      `/api/addon-services?${listQueryWith(params, 'category', category).toString()}`,
      undefined,
      false,
    ),
  getAddonService: (addonServiceId: number) =>
    apiClient.get<AddonService>(`/api/addon-services/${addonServiceId}`, undefined, false),

  getRoamingProductList: ({ country, ...params }: RoamingProductListParams = {}) =>
    apiClient.get<PageResponse<RoamingProduct>>(
      `/api/roaming-products?${listQueryWith(params, 'country', country).toString()}`,
      undefined,
      false,
    ),
  getRoamingProduct: (roamingProductId: number) =>
    apiClient.get<RoamingProduct>(`/api/roaming-products/${roamingProductId}`, undefined, false),

  getHomeProductList: ({ productType, ...params }: HomeProductListParams = {}) =>
    apiClient.get<PageResponse<HomeProduct>>(
      `/api/home-products?${listQueryWith(params, 'productType', productType).toString()}`,
      undefined,
      false,
    ),
  getHomeProduct: (homeProductId: number) =>
    apiClient.get<HomeProduct>(`/api/home-products/${homeProductId}`, undefined, false),
}
