import type {
  AddonCategory,
  BundleType,
  HomeProductType,
  NetworkType,
  PlanSummary,
  PlanTargetGroup,
} from './types'

export const NETWORK_TYPE_LABELS: Record<NetworkType, string> = {
  FIVE_G: '5G',
  LTE: 'LTE',
}

export const PLAN_TARGET_GROUP_LABELS: Record<PlanTargetGroup, string> = {
  GENERAL: '일반',
  YOUTH: '청소년',
  SENIOR: '시니어',
  KIDS: '키즈',
  WATCH: '워치',
  TABLET: '태블릿',
}

export const BUNDLE_TYPE_LABELS: Record<BundleType, string> = {
  FAMILY: '가족 결합',
  HOME: '홈 결합',
  DUO: '2인 결합',
  ETC: '기타 결합',
}

export const ADDON_CATEGORY_LABELS: Record<AddonCategory, string> = {
  DATA_CHARGE: '데이터 충전',
  VOICE_CHARGE: '음성 충전',
  CONTENT: '콘텐츠',
  SAFETY: '안심·보호',
  CALL: '통화 편의',
  BLOCKING: '차단',
  ETC: '기타',
}

export const HOME_PRODUCT_TYPE_LABELS: Record<HomeProductType, string> = {
  INTERNET: '인터넷',
  IPTV: 'IPTV',
}

// 결합 상품의 회선 수입니다. null이면 회선 수 제한 없이 2회선부터 할인됩니다.
export function formatLineCount(lineCount: number | null) {
  return lineCount === null ? '2회선 이상' : `${lineCount}회선`
}

// 1000Mbps 이상은 Gbps로 보여 줍니다.
export function formatMbps(mbps: number) {
  if (mbps < 1000) return `${mbps}Mbps`
  const gbps = mbps / 1000
  return `${Number.isInteger(gbps) ? gbps : gbps.toFixed(1)}Gbps`
}

export function formatWon(amount: number) {
  return `${amount.toLocaleString('ko-KR')}원`
}

// 백엔드는 데이터 양을 MB로 줍니다. 1GB 이상이면 GB로 바꿔 보여줍니다.
export function formatDataAmount(megabytes: number) {
  if (megabytes < 1024) return `${megabytes.toLocaleString('ko-KR')}MB`
  const gigabytes = megabytes / 1024
  return `${Number.isInteger(gigabytes) ? gigabytes.toLocaleString('ko-KR') : gigabytes.toFixed(1)}GB`
}

export function formatSpeed(kbps: number) {
  if (kbps < 1000) return `${kbps}Kbps`
  const mbps = kbps / 1000
  return `${Number.isInteger(mbps) ? mbps : mbps.toFixed(1)}Mbps`
}

export function formatPlanData(plan: Pick<PlanSummary, 'dataAmountMb' | 'dataUnlimited'>) {
  if (plan.dataUnlimited) return '무제한'
  return plan.dataAmountMb === null ? '-' : formatDataAmount(plan.dataAmountMb)
}

export function formatPlanVoice(plan: Pick<PlanSummary, 'voiceMinutes' | 'voiceUnlimited'>) {
  if (plan.voiceUnlimited) return '무제한'
  return plan.voiceMinutes === null ? '-' : `${plan.voiceMinutes.toLocaleString('ko-KR')}분`
}

export function formatPlanSms(plan: Pick<PlanSummary, 'smsCount' | 'smsUnlimited'>) {
  if (plan.smsUnlimited) return '무제한'
  return plan.smsCount === null ? '-' : `${plan.smsCount.toLocaleString('ko-KR')}건`
}

// 가입 연령 제한이 없으면 null을 돌려줍니다.
export function formatAgeRange(minAge: number | null, maxAge: number | null) {
  if (minAge !== null && maxAge !== null) return `만 ${minAge}~${maxAge}세`
  if (minAge !== null) return `만 ${minAge}세 이상`
  if (maxAge !== null) return `만 ${maxAge}세 이하`
  return null
}
