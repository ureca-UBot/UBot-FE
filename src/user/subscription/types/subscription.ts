import type { BundleType, HomeProductType, PlanDetail } from '../../../shared/product/types'

export type SubscriptionStatus = 'ACTIVE' | 'SUSPENDED' | 'TERMINATED'
export type SimType = 'USIM' | 'ESIM'
export type SimStatus = 'ACTIVE' | 'SUSPENDED' | 'LOST' | 'REPLACED' | 'DEACTIVATED'

// BE SubscriptionResponseDto. SIM 식별자는 서버가 뒤 4자리만 남기고 가려서 내려줍니다.
export interface Subscription {
  subscriptionId: number
  phoneNumber: string
  status: SubscriptionStatus
  activatedAt: string
  terminatedAt: string | null
  planId: number
  planName: string
  simType: SimType | null
  maskedSimIdentifier: string | null
  simStatus: SimStatus | null
  simActivatedAt: string | null
  simDeactivatedAt: string | null
}

export type SubscriptionBundleStatus = 'ACTIVE' | 'ENDED'

// BE BundleGroupResponseDto.Member. 다른 사람 회선이 섞일 수 있어 번호는 가려서 내려옵니다.
export interface BundleGroupMember {
  subscriptionId: number
  maskedPhoneNumber: string
  representative: boolean
}

// BE BundleGroupResponseDto. 결합 그룹의 현재 상태입니다.
// requiredLineCount가 null이면 2회선 이상이면 할인됩니다.
// discountAmount는 할인이 적용될 때 대표 회선에서 빠지는 금액이며, 적용되지 않으면 0입니다.
export interface BundleGroup {
  bundleGroupId: number
  bundleProductId: number
  bundleProductName: string
  bundleType: BundleType
  lineCount: number
  requiredLineCount: number | null
  discountApplied: boolean
  discountAmount: number
  members: BundleGroupMember[]
}

// BE SubscriptionBundleResponseDto. 이름과 할인액은 가입 당시 값입니다.
// group은 이용 중인 결합에만 있고, 종료된 결합이나 그룹 없이 남은 기록은 null입니다.
export interface SubscriptionBundle {
  subscriptionBundleId: number
  bundleProductId: number
  name: string
  appliedDiscountAmount: number | null
  status: SubscriptionBundleStatus
  joinedAt: string
  endedAt: string | null
  group: BundleGroup | null
}

export type SubscriptionAddonStatus = 'ACTIVE' | 'CANCELED'

// BE SubscriptionAddonResponseDto. 이름과 월 요금은 가입 당시 값입니다.
export interface SubscriptionAddon {
  subscriptionAddonId: number
  addonServiceId: number
  name: string
  monthlyFee: number | null
  status: SubscriptionAddonStatus
  subscribedAt: string
  canceledAt: string | null
}

export type SubscriptionRoamingStatus = 'SCHEDULED' | 'ACTIVE' | 'EXPIRED' | 'CANCELED'

// BE SubscriptionRoamingResponseDto. 이름·요금·데이터는 가입 당시 값입니다.
export interface SubscriptionRoaming {
  subscriptionRoamingId: number
  roamingProductId: number
  name: string
  country: string | null
  dailyFee: number | null
  dataAmountMb: number | null
  startDate: string
  endDate: string
  status: SubscriptionRoamingStatus
  canceledAt: string | null
}

// BE UsageAllowanceResponseDto. 그 달에 적용된 제공량이며, 기록에 없는 값은 null입니다.
export interface UsageAllowance {
  dataAmountMb: number | null
  dataUnlimited: boolean | null
  voiceMinutes: number | null
  voiceUnlimited: boolean | null
  smsCount: number | null
  smsUnlimited: boolean | null
}

// BE UsageRecordResponseDto. billingMonth는 'yyyy-MM'입니다.
// 남은 양은 무제한이거나 제공량 기록이 없으면 null입니다.
export interface UsageRecord {
  usageId: number
  billingMonth: string
  dataUsedMb: number
  voiceUsedMinutes: number
  smsUsedCount: number
  allowance: UsageAllowance | null
  remainingDataMb: number | null
  remainingVoiceMinutes: number | null
  remainingSmsCount: number | null
  aggregatedThroughDate: string | null
  finalized: boolean
  finalizedAt: string | null
  fullMonthActive: boolean | null
}

export type PaymentStatus = 'UNPAID' | 'PAID' | 'OVERDUE'
export type PaymentMethod = 'CARD' | 'ACCOUNT' | 'AUTO_TRANSFER' | 'ETC'

// BE BillingRecordResponseDto. billingMonth는 'yyyy-MM'입니다.
export interface BillingRecord {
  billingId: number
  billingMonth: string
  baseFee: number
  addonFee: number
  roamingFee: number
  extraFee: number
  discountAmount: number
  totalAmount: number
  dueDate: string | null
  paymentStatus: PaymentStatus
  paidAmount: number
  paymentMethod: PaymentMethod | null
  paidAt: string | null
}

export type ContractType = 'SELECTIVE_CONTRACT' | 'DEVICE_SUBSIDY'
export type ContractStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELED'
export type InstallmentStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELED'

// BE InstallmentResponseDto. 단말 할부가 없는 약정이면 내려오지 않습니다.
export interface Installment {
  deviceName: string
  deviceTotalAmount: number | null
  installmentMonths: number | null
  paidInstallmentMonths: number | null
  monthlyInstallmentAmount: number | null
  remainingInstallmentAmount: number | null
  installmentStartedAt: string | null
  installmentExpiresAt: string | null
  installmentStatus: InstallmentStatus | null
}

// BE SubscriptionContractResponseDto
export interface SubscriptionContract {
  contractId: number
  contractType: ContractType
  startedAt: string
  expiresAt: string
  discountAmount: number | null
  status: ContractStatus
  canceledAt: string | null
  installment: Installment | null
}

export type HomeSubscriptionStatus = 'ACTIVE' | 'ENDED'

// BE HomeSubscriptionResponseDto. 인터넷·IPTV는 회선이 아니라 사용자 단위로 가입합니다.
// 이름과 월 요금은 가입 당시 값입니다.
export interface HomeSubscription {
  homeSubscriptionId: number
  homeProductId: number
  productType: HomeProductType
  name: string
  monthlyFee: number
  status: HomeSubscriptionStatus
  joinedAt: string
  endedAt: string | null
}

// ── 가입·변경 요청 ─────────────────────────────────────────

// 번호를 비우면 서버가 배정합니다. 하이픈은 있어도 없어도 됩니다(010-1234-5678).
export interface SubscriptionCreateRequest {
  planId: number
  phoneNumber?: string
}

// 날짜는 'yyyy-MM-dd'입니다. 시작일은 오늘부터, 기간은 최대 90일입니다.
export interface RoamingScheduleRequest {
  roamingProductId: number
  startDate: string
  endDate: string
}

// 회선 하나의 화면에 쓰는 정보입니다. 항목마다 따로 조회합니다.
export interface SubscriptionDetail {
  plan: PlanDetail
  contract: SubscriptionContract | null
  bundles: SubscriptionBundle[]
  addons: SubscriptionAddon[]
  roamings: SubscriptionRoaming[]
  // 가장 최근 달의 사용량입니다. 기록이 없으면 null입니다.
  usage: UsageRecord | null
  // 최근 청구 내역입니다. 최근 달이 앞에 옵니다.
  bills: BillingRecord[]
}

export type SubscriptionDetailKey = keyof SubscriptionDetail

// 조회가 끝난 항목의 결과입니다. 실패는 그 항목에만 남기고 다른 항목에는 영향을 주지 않습니다.
export type PartResult<T> = { status: 'loaded'; value: T } | { status: 'failed'; message: string }

// 항목별 조회 결과입니다. 아직 결과가 없는 항목은 불러오는 중입니다.
export type SubscriptionDetailParts = {
  [Key in SubscriptionDetailKey]?: PartResult<SubscriptionDetail[Key]>
}
