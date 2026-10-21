export type NetworkType = 'FIVE_G' | 'LTE'
export type PlanTargetGroup = 'GENERAL' | 'YOUTH' | 'SENIOR' | 'KIDS' | 'WATCH' | 'TABLET'

// 무제한이면 해당 제공량은 null로 내려옵니다. 소진 후 속도는 데이터가 무제한이 아닐 때만 있을 수 있습니다.
export interface PlanSummary {
  planId: number
  planCode: string
  name: string
  networkType: NetworkType
  targetGroup: PlanTargetGroup
  monthlyFee: number
  dataAmountMb: number | null
  dataUnlimited: boolean
  exhaustedSpeedKbps: number | null
  voiceMinutes: number | null
  voiceUnlimited: boolean
  smsCount: number | null
  smsUnlimited: boolean
}

// 목록은 PlanSummary만 내려주고, 설명·테더링·가입 연령은 단건 조회에서만 내려옵니다.
export interface PlanDetail {
  summary: PlanSummary
  description: string | null
  tetheringAmountMb: number
  minAge: number | null
  maxAge: number | null
}

export interface BundleProduct {
  bundleProductId: number
  code: string
  name: string
  description: string | null
  discountAmount: number
}

export interface AddonService {
  addonServiceId: number
  code: string
  name: string
  description: string | null
  monthlyFee: number
}

export interface RoamingProduct {
  roamingProductId: number
  code: string
  name: string
  description: string | null
  dailyFee: number
  dataAmountMb: number
  country: string
}
