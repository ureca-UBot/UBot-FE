import type {
  AddonCategory,
  AddonService,
  BundleProduct,
  BundleType,
  HomeProduct,
  HomeProductType,
  NetworkType,
  PlanDetail,
  PlanTargetGroup,
  RoamingProduct,
} from '../../../shared/product/types'

export type MasterStatus = 'ACTIVE' | 'INACTIVE'

export interface AdminMetadata {
  createdBy: number | null
  updatedBy: number | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

// 관리자 응답은 모든 종류가 같은 모양입니다. 사용자용 상세(detail)에 상태와 관리 정보를 덧붙입니다.
export interface AdminProduct<TDetail> {
  detail: TDetail
  status: MasterStatus
  metadata: AdminMetadata
}

export type AdminPlan = AdminProduct<PlanDetail>
export type AdminBundleProduct = AdminProduct<BundleProduct>
export type AdminAddonService = AdminProduct<AddonService>
export type AdminRoamingProduct = AdminProduct<RoamingProduct>
export type AdminHomeProduct = AdminProduct<HomeProduct>

export interface AdminProductListParams {
  keyword: string
  status: MasterStatus | null
  // true면 삭제된 상품만, false면 삭제되지 않은 상품만 조회합니다.
  deleted: boolean
  page: number
  size: number
}

// ── 요청 본문 ─────────────────────────────────────────────
// 수정 요청에는 상품 코드가 없습니다. 코드는 등록할 때만 정할 수 있습니다.

export interface PlanUpdateRequest {
  name: string
  description: string | null
  networkType: NetworkType
  targetGroup: PlanTargetGroup
  monthlyFee: number
  // 무제한이면 제공량(과 데이터의 소진 후 속도)은 반드시 null이어야 합니다. 아니면 PLAN-003으로 거절됩니다.
  dataAmountMb: number | null
  dataUnlimited: boolean
  exhaustedSpeedKbps: number | null
  voiceMinutes: number | null
  voiceUnlimited: boolean
  smsCount: number | null
  smsUnlimited: boolean
  tetheringAmountMb: number
  minAge: number | null
  maxAge: number | null
}

export interface PlanCreateRequest extends PlanUpdateRequest {
  planCode: string
}

// 등록할 때 bundleType을 비우면 ETC, lineCount를 비우면 회선 수 제한 없음으로 저장됩니다.
// 수정할 때 bundleType·lineCount·homeProductId를 null로 보내면 기존 값이 유지됩니다(지울 수 없습니다).
export interface BundleProductUpdateRequest {
  name: string
  description: string | null
  discountAmount: number
  bundleType: BundleType
  lineCount: number | null
  homeProductId: number | null
}

export interface BundleProductCreateRequest extends BundleProductUpdateRequest {
  code: string
}

// category를 비우면 등록은 ETC, 수정은 기존 값으로 저장됩니다. 화면에서는 항상 골라서 보냅니다.
export interface AddonServiceUpdateRequest {
  name: string
  description: string | null
  monthlyFee: number
  category: AddonCategory
}

export interface AddonServiceCreateRequest extends AddonServiceUpdateRequest {
  code: string
}

export interface RoamingProductUpdateRequest {
  name: string
  description: string | null
  dailyFee: number
  dataAmountMb: number
  country: string
}

export interface RoamingProductCreateRequest extends RoamingProductUpdateRequest {
  code: string
}

// 상품 종류(인터넷·IPTV)는 등록할 때만 정합니다. 인터넷은 speedMbps가 필요하고 IPTV는 null이어야 합니다.
export interface HomeProductUpdateRequest {
  name: string
  description: string | null
  speedMbps: number | null
  monthlyFee: number
}

export interface HomeProductCreateRequest extends HomeProductUpdateRequest {
  code: string
  productType: HomeProductType
}

// 요금제에 포함된 부가서비스를 통째로 바꿉니다. 빈 목록이면 모두 뺍니다.
export interface PlanIncludedAddonRequest {
  addonServiceIds: number[]
}

// ── 폼 값 ─────────────────────────────────────────────────
// 숫자 칸도 입력 중에는 문자열로 둡니다. 빈 칸(값 없음)과 0을 구분해야 하기 때문입니다.

export interface ProductCommonValues {
  code: string
  name: string
  description: string
}

export interface PlanFormValues extends ProductCommonValues {
  networkType: NetworkType
  targetGroup: PlanTargetGroup
  monthlyFee: string
  dataUnlimited: boolean
  dataAmountMb: string
  exhaustedSpeedKbps: string
  voiceUnlimited: boolean
  voiceMinutes: string
  smsUnlimited: boolean
  smsCount: string
  tetheringAmountMb: string
  minAge: string
  maxAge: string
}

export interface BundleProductFormValues extends ProductCommonValues {
  discountAmount: string
  bundleType: BundleType
  lineCount: string
  // 홈 결합의 인터넷 상품 ID입니다. 고르지 않았으면 빈 문자열입니다.
  homeProductId: string
}

export interface AddonServiceFormValues extends ProductCommonValues {
  monthlyFee: string
  category: AddonCategory
}

export interface HomeProductFormValues extends ProductCommonValues {
  productType: HomeProductType
  speedMbps: string
  monthlyFee: string
}

export interface RoamingProductFormValues extends ProductCommonValues {
  dailyFee: string
  dataAmountMb: string
  country: string
}
