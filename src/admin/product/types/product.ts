import type {
  AddonService,
  BundleProduct,
  NetworkType,
  PlanDetail,
  PlanTargetGroup,
  RoamingProduct,
} from '../../../user/product/types/product'

export type MasterStatus = 'ACTIVE' | 'INACTIVE'

export interface AdminMetadata {
  createdBy: number | null
  updatedBy: number | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

// 관리자 응답은 4종 모두 같은 모양입니다. 사용자용 상세(detail)에 상태와 관리 정보를 덧붙입니다.
export interface AdminProduct<TDetail> {
  detail: TDetail
  status: MasterStatus
  metadata: AdminMetadata
}

export type AdminPlan = AdminProduct<PlanDetail>
export type AdminBundleProduct = AdminProduct<BundleProduct>
export type AdminAddonService = AdminProduct<AddonService>
export type AdminRoamingProduct = AdminProduct<RoamingProduct>

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

export interface BundleProductUpdateRequest {
  name: string
  description: string | null
  discountAmount: number
}

export interface BundleProductCreateRequest extends BundleProductUpdateRequest {
  code: string
}

export interface AddonServiceUpdateRequest {
  name: string
  description: string | null
  monthlyFee: number
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
}

export interface AddonServiceFormValues extends ProductCommonValues {
  monthlyFee: string
}

export interface RoamingProductFormValues extends ProductCommonValues {
  dailyFee: string
  dataAmountMb: string
  country: string
}
