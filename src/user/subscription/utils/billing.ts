import type {
  BillingRecord,
  SubscriptionDetailParts,
  SubscriptionStatus,
} from '../types/subscription'
import { countDays } from './format'

export interface BillItem {
  label: string
  amount: number | null
}

export interface BillEstimate {
  status: 'loading' | 'failed' | 'ready' | 'inactive'
  items: BillItem[]
  total: number | null
}

// 월정액과 현재 가입 상태를 기준으로 한 예상치입니다. 과거 청구 금액을 재사용하지 않습니다.
export function estimateBill(
  parts: SubscriptionDetailParts,
  month: string,
  status: SubscriptionStatus = 'ACTIVE',
): BillEstimate {
  if (status === 'TERMINATED') return { status: 'inactive', items: [], total: null }
  const { plan, addons, bundles, contracts, roamings } = parts
  if ([plan, addons, bundles, contracts, roamings].some((part) => part?.status === 'failed'))
    return { status: 'failed', items: [], total: null }
  if (
    plan?.status !== 'loaded' ||
    addons?.status !== 'loaded' ||
    bundles?.status !== 'loaded' ||
    contracts?.status !== 'loaded' ||
    roamings?.status !== 'loaded'
  )
    return { status: 'loading', items: [], total: null }

  const items: BillItem[] = [
    { label: `요금제 · ${plan.value.summary.name}`, amount: plan.value.summary.monthlyFee },
  ]
  for (const addon of addons.value.filter((item) => item.status === 'ACTIVE'))
    items.push({ label: `부가서비스 · ${addon.name}`, amount: addon.monthlyFee })
  for (const bundle of bundles.value.filter((item) => item.status === 'ACTIVE')) {
    if (bundle.appliedDiscountAmount !== 0)
      items.push({
        label: `결합 할인 · ${bundle.name}`,
        amount: bundle.appliedDiscountAmount === null ? null : -bundle.appliedDiscountAmount,
      })
  }
  const currentContract = contracts.value.find((item) => item.status === 'ACTIVE')
  if (currentContract && currentContract.discountAmount !== 0)
    items.push({
      label: '약정 할인',
      amount: currentContract.discountAmount === null ? null : -currentContract.discountAmount,
    })
  for (const contract of contracts.value) {
    if (contract.installment?.installmentStatus === 'ACTIVE')
      items.push({
        label: `단말 할부 · ${contract.installment.deviceName}`,
        amount: contract.installment.monthlyInstallmentAmount,
      })
  }
  const [year, monthNumber] = month.split('-').map(Number)
  const firstDay = `${month}-01`
  const lastDay = `${month}-${new Date(year, monthNumber, 0).getDate()}`
  for (const roaming of roamings.value.filter((item) => item.status !== 'CANCELED')) {
    const start = roaming.startDate > firstDay ? roaming.startDate : firstDay
    const end = roaming.endDate < lastDay ? roaming.endDate : lastDay
    if (start <= end) {
      const days = countDays(start, end)
      items.push({
        label: `로밍 · ${roaming.name} (${days}일)`,
        amount: roaming.dailyFee === null ? null : roaming.dailyFee * days,
      })
    }
  }
  const total = items.some((item) => item.amount === null)
    ? null
    : Math.max(
        0,
        items.reduce((sum, item) => sum + (item.amount ?? 0), 0),
      )
  return { status: 'ready', items, total }
}

export function billedItems(bill: BillingRecord): BillItem[] {
  return [
    { label: '기본료', amount: bill.baseFee },
    { label: '부가서비스', amount: bill.addonFee },
    { label: '로밍', amount: bill.roamingFee },
    { label: '기타 요금', amount: bill.extraFee },
    { label: '할인', amount: -bill.discountAmount },
  ].filter((item) => item.amount !== 0 || item.label === '기본료')
}
