import type { ChatTurn, ConversationMessage } from '../types/chat'
import { getAnswerText } from '../utils/answerText'

const PREFIX = 'ubot:chat-session:v1:'
const MAX_CONVERSATIONS = 20
interface Snapshot {
  conversationId: string | null
  turns: ChatTurn[]
  updatedAt: number
}
interface Session {
  version: 1
  activeConversationId: string | null
  conversations: Snapshot[]
}

const storageKey = (userId: string | null) =>
  PREFIX + (userId === null ? 'guest' : `user:${userId}`)

function validResponse(value: unknown) {
  if (value === null) return true
  if (typeof value !== 'object') return false
  const response = value as { answer?: unknown; status?: unknown }
  return (
    typeof response.answer === 'string' &&
    (response.status === 'SUCCESS' || response.status === 'FAIL')
  )
}

function validTurn(value: unknown): value is ChatTurn {
  if (typeof value !== 'object' || value === null) return false
  const turn = value as Partial<ChatTurn>
  return (
    typeof turn.id === 'number' &&
    Number.isSafeInteger(turn.id) &&
    typeof turn.question === 'string' &&
    typeof turn.isPending === 'boolean' &&
    Array.isArray(turn.researches) &&
    turn.researches.every(
      (item) =>
        item &&
        ['GENERAL', 'STORE_DATA', 'USER_DATA', 'PRODUCT_DATA'].includes(item.intent) &&
        typeof item.isPending === 'boolean' &&
        validResponse(item.response),
    ) &&
    validResponse(turn.response)
  )
}

function read(userId: string | null): Session | null {
  try {
    const data = JSON.parse(sessionStorage.getItem(storageKey(userId)) ?? 'null') as Session | null
    if (
      !data ||
      data.version !== 1 ||
      !Array.isArray(data.conversations) ||
      !(data.activeConversationId === null || typeof data.activeConversationId === 'string')
    )
      return null
    if (
      !data.conversations.every(
        (item) =>
          item &&
          (item.conversationId === null || typeof item.conversationId === 'string') &&
          typeof item.updatedAt === 'number' &&
          Array.isArray(item.turns) &&
          item.turns.every(validTurn),
      )
    )
      return null
    return data
  } catch {
    return null
  }
}

function settledTurns(turns: ChatTurn[]): ChatTurn[] {
  return turns.map((turn) => {
    const interrupted = turn.isPending || turn.isLocating || turn.isCancelling
    return {
      ...turn,
      isPending: false,
      isLocating: false,
      isCancelling: false,
      progress: null,
      ...(interrupted
        ? {
            error: '새로고침으로 답변 확인이 중단됐습니다. 대화 기록에서 결과를 확인해 주세요.',
            errorCode: null,
          }
        : {}),
      researches: turn.researches.map((research) => ({
        ...research,
        isPending: false,
        progress: null,
        ...(research.isPending
          ? { error: '새로고침으로 재검색 결과 확인이 중단됐습니다.', errorCode: null }
          : {}),
      })),
    }
  })
}

export function readActiveChat(userId: string | null): Snapshot | null {
  const data = read(userId)
  return (
    data?.conversations.find((item) => item.conversationId === data.activeConversationId) ?? null
  )
}

export function readSavedConversation(userId: string | null, conversationId: string): ChatTurn[] {
  return (
    read(userId)?.conversations.find((item) => item.conversationId === conversationId)?.turns ?? []
  )
}

// 탭 안에서만 보관하며, 로그아웃·계정 변경 시 해당 계정의 저장본도 지웁니다.
export function clearSavedChat(userId: string | null) {
  try {
    sessionStorage.removeItem(storageKey(userId))
  } catch {
    /* 저장소 차단 시 메모리 상태는 유지합니다. */
  }
}

export function forgetSavedConversation(userId: string | null, conversationId: string) {
  const data = read(userId)
  if (!data) return
  try {
    sessionStorage.setItem(
      storageKey(userId),
      JSON.stringify({
        ...data,
        activeConversationId:
          data.activeConversationId === conversationId ? null : data.activeConversationId,
        conversations: data.conversations.filter((item) => item.conversationId !== conversationId),
      }),
    )
  } catch {
    /* 저장소 사용이 막혀도 서버 삭제는 유지합니다. */
  }
}

export function saveChat(userId: string | null, conversationId: string | null, turns: ChatTurn[]) {
  const snapshot: Snapshot = { conversationId, turns: settledTurns(turns), updatedAt: Date.now() }
  const previous = read(userId)?.conversations ?? []
  const conversations = [
    snapshot,
    ...previous.filter((item) => item.conversationId !== conversationId),
  ].slice(0, MAX_CONVERSATIONS)
  const data: Session = { version: 1, activeConversationId: conversationId, conversations }
  try {
    sessionStorage.setItem(storageKey(userId), JSON.stringify(data))
  } catch {
    // 저장 용량이 부족하면 오래된 대화부터 줄이고 현재 대화는 우선 보관합니다.
    for (let size = conversations.length - 1; size >= 1; size--) {
      try {
        sessionStorage.setItem(
          storageKey(userId),
          JSON.stringify({ ...data, conversations: conversations.slice(0, size) }),
        )
        break
      } catch {
        /* 다음 크기로 다시 시도합니다. */
      }
    }
  }
}

// 이력 API의 문장을 기준으로 일치하는 카드·지도·선택 상태만 복원합니다.
// 같은 질문을 여러 번 했어도 한 저장본을 두 이력에 중복 적용하지 않습니다.
export function mergeSavedMessages(
  messages: ConversationMessage[],
  cached: ChatTurn[],
  conversationId: string,
  nextId: () => number,
): ChatTurn[] {
  const candidates = cached.flatMap((turn) => [
    turn,
    ...turn.researches
      .filter((item) => item.response)
      .map((item) => ({
        ...turn,
        response: item.response,
        view: item.view,
        researches: [],
      })),
  ])
  const used = new Set<number>()
  return messages.map((message) => {
    const index = candidates.findIndex(
      (turn, candidate) =>
        !used.has(candidate) &&
        turn.question === message.question &&
        turn.response?.status === 'SUCCESS' &&
        getAnswerText(turn.response.answer) === getAnswerText(message.answer),
    )
    const match = index >= 0 ? candidates[index] : undefined
    if (match) used.add(index)
    return {
      ...match,
      id: nextId(),
      question: message.question,
      isPending: false,
      isLocating: false,
      isCancelled: false,
      isCancelling: false,
      progress: null,
      response: {
        ...match?.response,
        answer: message.answer,
        status: 'SUCCESS',
        conversationId,
        idempotencyKey: match?.response?.idempotencyKey ?? null,
        attemptCount: match?.response?.attemptCount ?? 0,
        retryable: false,
      },
      error: null,
      errorCode: null,
      researches: [],
    }
  })
}
