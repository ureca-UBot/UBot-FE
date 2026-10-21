import { ApiRequestError } from '../../../shared/api/client'
import type { ChatIntent, ChatProgress, ChatResearch, ChatResponse, ChatTurn } from '../types/chat'

interface SettledResult {
  response: ChatResponse | null
  error: string | null
  errorCode: string | null
}

// 공통 오류의 data는 검증 오류 목록이나 null일 수도 있습니다.
export function isChatResponse(value: unknown): value is ChatResponse {
  if (typeof value !== 'object' || value === null) return false
  const data = value as Partial<ChatResponse>
  return (
    typeof data.answer === 'string' &&
    (data.status === 'SUCCESS' || data.status === 'FAIL') &&
    (data.idempotencyKey === null || typeof data.idempotencyKey === 'string') &&
    typeof data.attemptCount === 'number' &&
    Number.isInteger(data.attemptCount) &&
    data.attemptCount >= 0 &&
    typeof data.retryable === 'boolean'
  )
}

// 답변을 기다리는 turn의 진행 상태만 바꿉니다.
export function updateProgress(
  turns: ChatTurn[],
  turnId: number,
  progress: ChatProgress,
): ChatTurn[] {
  return turns.map((turn) => (turn.id === turnId && turn.isPending ? { ...turn, progress } : turn))
}

// 답변을 기다리는 재검색의 진행 상태만 바꿉니다.
export function updateResearchProgress(
  turns: ChatTurn[],
  turnId: number,
  intent: ChatIntent,
  progress: ChatProgress,
): ChatTurn[] {
  return turns.map((turn) =>
    turn.id !== turnId
      ? turn
      : {
          ...turn,
          researches: turn.researches.map((item) =>
            item.intent === intent && item.isPending ? { ...item, progress } : item,
          ),
        },
  )
}

// 요청 결과와 오류를 화면에 보여줄 값으로 정리합니다. 예외는 던지지 않습니다.
export async function settleRequest(request: () => Promise<ChatResponse>): Promise<SettledResult> {
  try {
    const result = await request()
    if (isChatResponse(result)) {
      return {
        response: result,
        error: result.status === 'FAIL' ? result.answer : null,
        errorCode: null,
      }
    }
    return { response: null, error: '서버의 답변 응답을 확인할 수 없습니다.', errorCode: null }
  } catch (cause) {
    if (cause instanceof ApiRequestError) {
      return {
        response: isChatResponse(cause.data) && cause.data.status === 'FAIL' ? cause.data : null,
        error: cause.message,
        errorCode: cause.code ?? null,
      }
    }
    return {
      response: null,
      error: '서버 응답을 받지 못했습니다. 연결 상태를 확인해 주세요.',
      errorCode: null,
    }
  }
}

// 같은 의도의 재검색 결과가 있으면 바꾸고, 없으면 뒤에 추가합니다.
export function upsertResearch(
  turns: ChatTurn[],
  turnId: number,
  research: ChatResearch,
): ChatTurn[] {
  return turns.map((turn) => {
    if (turn.id !== turnId) return turn
    const exists = turn.researches.some((item) => item.intent === research.intent)
    return {
      ...turn,
      researches: exists
        ? turn.researches.map((item) => (item.intent === research.intent ? research : item))
        : [...turn.researches, research],
    }
  })
}

// 서버에 닿지 못한 실패(네트워크 오류)만 다시 누를 수 있습니다.
// 서버가 처리한 재검색은 성공·실패와 관계없이 그 의도를 사용한 것으로 보기 때문입니다.
export function canResearchAgain(research: ChatResearch) {
  return !research.isPending && research.response === null && research.errorCode === null
}

// 게스트가 로그인하면 서버가 게스트 대화를 회원에게 승계하므로 화면의 대화도 유지합니다.
export function keepsConversation(previousUserId: string | null, userId: string | null) {
  return previousUserId === null && userId !== null
}
