import type { ChatProductCard, ChatProductType } from '../types/chat'
import { formatWon } from './userDataFormat'

const NETWORK_SPECS = ['5G', 'LTE']
const DATA_SPEC_PREFIX = '데이터 '

// 결합의 fee는 요금이 아니라 할인액입니다.
const FEE_PREFIX: Record<ChatProductType, string> = {
  PLAN: '월',
  ADDON: '월',
  ROAMING: '일',
  BUNDLE: '할인',
}

// 요금 줄의 앞말과 금액입니다. 0원인 요금은 앞말 없이 "무료"로 씁니다.
// 결합의 0은 할인이 없다는 뜻이라 "무료"로 바꾸지 않습니다. fee가 null이면 요금 줄이 없습니다.
export function productFee(
  card: ChatProductCard,
): { prefix: string | null; amount: string } | null {
  if (card.fee === null) return null
  if (card.fee === 0 && card.type !== 'BUNDLE') return { prefix: null, amount: '무료' }
  return { prefix: FEE_PREFIX[card.type], amount: `${formatWon(card.fee)}원` }
}

function dataSpec(specs: string[]) {
  return specs.find((spec) => spec.startsWith(DATA_SPEC_PREFIX))
}

// 요금제 specs에서 네트워크와 데이터 항목을 골라 한 줄로 잇습니다. 예: "5G. 데이터 24GB(소진 후 최대 1Mbps)"
// specs 순서에 기대지 않고 값으로 찾으며, 둘 다 없으면 null입니다.
export function planSummaryLine(specs: string[]): string | null {
  const network = specs.find((spec) => NETWORK_SPECS.includes(spec))
  const parts = [network, dataSpec(specs)].filter((part): part is string => Boolean(part))
  return parts.length > 0 ? parts.join('. ') : null
}

// 카드에 글머리표로 보여 줄 항목입니다. 아래에 적지 않은 specs는 보여 주지 않습니다.
// - 결합: specs 전부(홈 결합의 "필요 인터넷 …")를 맨 앞에 둡니다. 홈 결합이 아니면 specs가 비어 있습니다.
// - 로밍: 데이터 항목을 맨 앞에 둡니다.
// - 여러 장을 가로로 보여 줄 때의 요금제: 네트워크·데이터 요약 줄을 맨 앞에 둡니다.
// - 그 밖에는 highlights만 씁니다.
export function productBullets(card: ChatProductCard, inCarousel: boolean): string[] {
  if (card.type === 'BUNDLE') return [...card.specs, ...card.highlights]
  const lead =
    card.type === 'ROAMING'
      ? dataSpec(card.specs)
      : card.type === 'PLAN' && inCarousel
        ? planSummaryLine(card.specs)
        : null
  return lead ? [lead, ...card.highlights] : card.highlights
}
