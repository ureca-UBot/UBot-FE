import { formatDataAmount } from '../../product/utils/format'
import type {
  ContractStatus,
  ContractType,
  HomeSubscriptionStatus,
  InstallmentStatus,
  PaymentMethod,
  PaymentStatus,
  SimStatus,
  SimType,
  SubscriptionAddonStatus,
  SubscriptionBundleStatus,
  SubscriptionRoaming,
  SubscriptionRoamingStatus,
  SubscriptionStatus,
  UsageRecord,
} from '../types/subscription'

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  ACTIVE: '이용 중',
  SUSPENDED: '정지',
  TERMINATED: '해지',
}

export const SIM_TYPE_LABELS: Record<SimType, string> = {
  USIM: '유심',
  ESIM: 'eSIM',
}

export const SIM_STATUS_LABELS: Record<SimStatus, string> = {
  ACTIVE: '정상',
  SUSPENDED: '정지',
  LOST: '분실',
  REPLACED: '교체됨',
  DEACTIVATED: '비활성',
}

export const BUNDLE_STATUS_LABELS: Record<SubscriptionBundleStatus, string> = {
  ACTIVE: '이용 중',
  ENDED: '종료',
}

export const ADDON_STATUS_LABELS: Record<SubscriptionAddonStatus, string> = {
  ACTIVE: '이용 중',
  CANCELED: '해지',
}

export const HOME_SUBSCRIPTION_STATUS_LABELS: Record<HomeSubscriptionStatus, string> = {
  ACTIVE: '이용 중',
  ENDED: '해지',
}

export const ROAMING_STATUS_LABELS: Record<SubscriptionRoamingStatus, string> = {
  SCHEDULED: '이용 예정',
  ACTIVE: '이용 중',
  EXPIRED: '종료',
  CANCELED: '취소',
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  UNPAID: '미납',
  PAID: '납부 완료',
  OVERDUE: '연체',
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CARD: '카드',
  ACCOUNT: '계좌이체',
  AUTO_TRANSFER: '자동이체',
  ETC: '기타',
}

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  SELECTIVE_CONTRACT: '선택약정',
  DEVICE_SUBSIDY: '공시지원금 약정',
}

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  ACTIVE: '약정 중',
  EXPIRED: '만료',
  CANCELED: '해지',
}

export const INSTALLMENT_STATUS_LABELS: Record<InstallmentStatus, string> = {
  ACTIVE: '납부 중',
  COMPLETED: '완납',
  CANCELED: '취소',
}

// 상태 배지 색입니다. on: 이용 중·완료, pending: 예정, warn: 확인이 필요한 상태, off: 끝난 상태
export type StatusTone = 'on' | 'pending' | 'warn' | 'off'

export const ROAMING_STATUS_TONES: Record<SubscriptionRoamingStatus, StatusTone> = {
  SCHEDULED: 'pending',
  ACTIVE: 'on',
  EXPIRED: 'off',
  CANCELED: 'off',
}

export const CONTRACT_STATUS_TONES: Record<ContractStatus, StatusTone> = {
  ACTIVE: 'on',
  EXPIRED: 'off',
  CANCELED: 'off',
}

export const PAYMENT_STATUS_TONES: Record<PaymentStatus, StatusTone> = {
  UNPAID: 'pending',
  PAID: 'on',
  OVERDUE: 'warn',
}

// 서버는 날짜를 'yyyy-MM-dd', 일시를 'yyyy-MM-ddTHH:mm:ss'로 줍니다. 화면에는 날짜만 보여줍니다.
export function formatDate(value: string | null | undefined) {
  return value ? value.slice(0, 10) : '-'
}

export function formatPeriod(start: string | null | undefined, end: string | null | undefined) {
  return `${formatDate(start)} ~ ${formatDate(end)}`
}

// 브라우저 시간대 기준 'yyyy-MM-dd'입니다. 날짜 입력칸의 값과 서버의 LocalDate가 같은 모양입니다.
export function toLocalDateText(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function addDaysText(dateText: string, days: number) {
  const [year, month, day] = dateText.split('-').map(Number)
  return toLocalDateText(new Date(year, month - 1, day + days))
}

// 'yyyy-MM-dd' 두 날짜의 이용 일수입니다. 시작일과 종료일을 모두 셉니다.
export function countDays(startText: string, endText: string) {
  const [startYear, startMonth, startDay] = startText.split('-').map(Number)
  const [endYear, endMonth, endDay] = endText.split('-').map(Number)
  const start = Date.UTC(startYear, startMonth - 1, startDay)
  const end = Date.UTC(endYear, endMonth - 1, endDay)
  return Math.round((end - start) / 86_400_000) + 1
}

// 사용 시작 전(시작일이 오늘보다 뒤)인 예약만 취소할 수 있습니다. 백엔드 cancelRoaming과 같은 기준입니다.
export function isCancelableRoaming(
  roaming: Pick<SubscriptionRoaming, 'status' | 'startDate'>,
  today: string,
) {
  return roaming.status === 'SCHEDULED' && roaming.startDate > today
}

// 'yyyy-MM' → 'yyyy년 M월'
export function formatMonth(month: string) {
  const [year, monthNumber] = month.split('-')
  return `${year}년 ${Number(monthNumber)}월`
}

// 'yyyy-MM' → 'M월'
export function formatShortMonth(month: string) {
  return `${Number(month.split('-')[1])}월`
}

// 데이터 제공량이 정해져 있을 때만 사용률(0~100)을 돌려줍니다. 무제한이거나 제공량 기록이 없으면 null입니다.
export function dataUsagePercent(usage: UsageRecord | null) {
  const allowance = usage?.allowance
  if (!usage || !allowance || allowance.dataUnlimited !== false || !allowance.dataAmountMb)
    return null
  return Math.min(100, Math.round((usage.dataUsedMb / allowance.dataAmountMb) * 100))
}

function describeUsage(
  used: string,
  unlimited: boolean | null | undefined,
  provided: string | null,
  remaining: string | null,
) {
  if (unlimited) return `${used} 사용 · 무제한`
  if (provided === null || remaining === null) return `${used} 사용`
  return `${used} 사용 · ${remaining} 남음 (제공 ${provided})`
}

export function formatDataUsage(usage: UsageRecord) {
  const allowance = usage.allowance
  return describeUsage(
    formatDataAmount(usage.dataUsedMb),
    allowance?.dataUnlimited,
    allowance?.dataAmountMb == null ? null : formatDataAmount(allowance.dataAmountMb),
    usage.remainingDataMb == null ? null : formatDataAmount(usage.remainingDataMb),
  )
}

export function formatVoiceUsage(usage: UsageRecord) {
  const allowance = usage.allowance
  return describeUsage(
    `${usage.voiceUsedMinutes.toLocaleString('ko-KR')}분`,
    allowance?.voiceUnlimited,
    allowance?.voiceMinutes == null ? null : `${allowance.voiceMinutes.toLocaleString('ko-KR')}분`,
    usage.remainingVoiceMinutes == null
      ? null
      : `${usage.remainingVoiceMinutes.toLocaleString('ko-KR')}분`,
  )
}

export function formatSmsUsage(usage: UsageRecord) {
  const allowance = usage.allowance
  return describeUsage(
    `${usage.smsUsedCount.toLocaleString('ko-KR')}건`,
    allowance?.smsUnlimited,
    allowance?.smsCount == null ? null : `${allowance.smsCount.toLocaleString('ko-KR')}건`,
    usage.remainingSmsCount == null ? null : `${usage.remainingSmsCount.toLocaleString('ko-KR')}건`,
  )
}
