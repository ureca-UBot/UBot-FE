import type { ChatIntent, ChatStoreMap, ChatTurn } from '../types/chat'

export interface ChatStoreMapEntry {
  key: string
  map: ChatStoreMap
}

// 답변과 의도 재검색 결과를 구분하는 지도 키입니다. 질문 번호는 새 대화에서도 이어지므로 겹치지 않습니다.
export function storeMapKey(turnId: number, intent?: ChatIntent) {
  return intent ? `${turnId}:${intent}` : String(turnId)
}

// 대화에서 매장 지도 결과가 담긴 답변을 화면 순서대로 모읍니다.
export function collectStoreMaps(turns: ChatTurn[]): ChatStoreMapEntry[] {
  const entries: ChatStoreMapEntry[] = []
  turns.forEach((turn) => {
    const map = turn.response?.store?.map
    if (map) entries.push({ key: storeMapKey(turn.id), map })
    turn.researches.forEach((research) => {
      const researchMap = research.response?.store?.map
      if (researchMap)
        entries.push({ key: storeMapKey(turn.id, research.intent), map: researchMap })
    })
  })
  return entries
}
