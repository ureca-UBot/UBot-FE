import type { ChatProductCard } from '../types/chat'

const NETWORK_SPECS = ['5G', 'LTE']
const DATA_SPEC_PREFIX = '데이터 '

// 요금제 specs에서 네트워크와 데이터 항목을 골라 한 줄로 잇습니다. 예: "5G. 데이터 24GB(소진 후 최대 1Mbps)"
// specs 순서에 기대지 않고 값으로 찾으며, 둘 다 없으면 null입니다.
export function planSummaryLine(specs: string[]): string | null {
  const network = specs.find((spec) => NETWORK_SPECS.includes(spec))
  const data = specs.find((spec) => spec.startsWith(DATA_SPEC_PREFIX))
  const parts = [network, data].filter((part): part is string => Boolean(part))
  return parts.length > 0 ? parts.join('. ') : null
}

// 카드에 글머리표로 보여 줄 항목입니다.
// 여러 장을 가로로 보여 줄 때의 요금제만 요약 줄을 맨 앞에 두고, 그 밖에는 highlights만 씁니다.
export function productBullets(card: ChatProductCard, inCarousel: boolean): string[] {
  if (!inCarousel || card.type !== 'PLAN') return card.highlights
  const summary = planSummaryLine(card.specs)
  return summary ? [summary, ...card.highlights] : card.highlights
}
