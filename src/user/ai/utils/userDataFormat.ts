import type {
  ChatBillingCard,
  ChatPaymentStatus,
  ChatPlanCard,
  ChatUsageCard,
  ChatUserData,
} from '../types/chat'

const MB_PER_GB = 1024

export function formatWon(amount: number): string {
  return amount.toLocaleString('ko-KR')
}

// GB는 소수 한 자리까지 표시하고 ".0"은 뺍니다.
function formatGb(mb: number): string {
  return String(Math.round((mb / MB_PER_GB) * 10) / 10)
}

// 데이터는 MB로 오므로 1GB 이상은 GB로 바꿔 표시합니다.
export function formatDataMb(mb: number): string {
  return Math.abs(mb) >= MB_PER_GB ? `${formatGb(mb)}GB` : `${Math.round(mb)}MB`
}

// "6.1 / 15GB"처럼 단위가 같으면 한 번만 붙입니다.
export function formatDataPair(usedMb: number, totalMb: number): string {
  if (usedMb >= MB_PER_GB && totalMb >= MB_PER_GB) return `${formatGb(usedMb)} / ${formatGb(totalMb)}GB`
  return `${formatDataMb(usedMb)} / ${formatDataMb(totalMb)}`
}

export function formatSpeedKbps(kbps: number): string {
  return kbps >= 1000 ? `${Math.round(kbps / 100) / 10}Mbps` : `${kbps}kbps`
}

function parseYearMonth(yearMonth: string) {
  const [year, month] = yearMonth.split('-').map(Number)
  return { year, month }
}

// "2026-10-25" → "10/25"
export function formatMonthDay(date: string): string {
  const [, month, day] = date.split('-').map(Number)
  return `${month}/${day}`
}

// 백엔드 답변 문장과 같은 형식입니다. 예: 2026년 10월 청구서(9월 사용분)
export function billingTitle(billingMonth: string, usageMonth: number): string {
  const { year, month } = parseYearMonth(billingMonth)
  return `${year}년 ${month}월 청구서(${usageMonth}월 사용분)`
}

// 사용량의 billingMonth는 사용한 달입니다. 예: 2026년 9월 사용량
export function usageTitle(billingMonth: string): string {
  const { year, month } = parseYearMonth(billingMonth)
  return `${year}년 ${month}월 사용량`
}

// 그래프 x축 라벨입니다. 기준 연도와 다른 달만 연도를 붙입니다.
export function shortMonthLabel(yearMonth: string, baseYear: number): string {
  const { year, month } = parseYearMonth(yearMonth)
  return year === baseYear ? `${month}월` : `${String(year).slice(2)}년 ${month}월`
}

export function yearOf(yearMonth: string): number {
  return parseYearMonth(yearMonth).year
}

export function aggregatedLabel(aggregatedThroughDate: string | null): string {
  return aggregatedThroughDate ? `${formatMonthDay(aggregatedThroughDate)}까지 집계` : '집계 중'
}

export function paymentLabel(status: ChatPaymentStatus, dueDate: string | null): string {
  if (status === 'PAID') return '납부 완료'
  if (status === 'OVERDUE') return '연체'
  return dueDate ? `미납 · ${formatMonthDay(dueDate)}까지` : '미납'
}

// 증감 표시입니다. 예: ▲12,400 / ▼3,000 / –
export function formatDelta(diff: number): string {
  if (diff > 0) return `▲${formatWon(diff)}`
  if (diff < 0) return `▼${formatWon(-diff)}`
  return '–'
}

export interface UserDataLine {
  phoneNumber: string
  plans: ChatPlanCard[]
  usages: ChatUsageCard[]
  billings: ChatBillingCard[]
}

// 회선별로 묶고, 사용량·청구서는 월 순서로 정렬합니다. 서버는 목록 순서를 보장하지 않습니다.
export function groupByPhone(userData: ChatUserData): UserDataLine[] {
  const lines = new Map<string, UserDataLine>()
  const lineOf = (phoneNumber: string) => {
    let line = lines.get(phoneNumber)
    if (!line) {
      line = { phoneNumber, plans: [], usages: [], billings: [] }
      lines.set(phoneNumber, line)
    }
    return line
  }
  userData.plans.forEach((card) => lineOf(card.phoneNumber).plans.push(card))
  userData.usages.forEach((card) => lineOf(card.phoneNumber).usages.push(card))
  userData.billings.forEach((card) => lineOf(card.phoneNumber).billings.push(card))

  return [...lines.values()].map((line) => ({
    ...line,
    usages: [...line.usages].sort((a, b) => a.usage.billingMonth.localeCompare(b.usage.billingMonth)),
    billings: [...line.billings].sort((a, b) => a.billing.billingMonth.localeCompare(b.billing.billingMonth)),
  }))
}
