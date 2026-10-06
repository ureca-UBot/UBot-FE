import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../../auth/hooks/useAuth'
import { ApiRequestError } from '../../../shared/api/client'
import { chatApi } from '../api/chatApi'
import type {
  ChatIntent,
  ChatLocation,
  ChatResearch,
  ChatResearchRequest,
  ChatResponse,
  ChatTurn,
  FaqAnswerSelection,
} from '../types/chat'
import { ChatContext, type ChatContextValue } from './ChatContext'

interface ChatState {
  userId: string | null
  turns: ChatTurn[]
  error: string | null
}

interface SettledResult {
  response: ChatResponse | null
  error: string | null
  errorCode: string | null
}

// 공통 오류의 data는 검증 오류 목록이나 null일 수도 있습니다.
function isChatResponse(value: unknown): value is ChatResponse {
  if (typeof value !== 'object' || value === null) return false
  const data = value as Partial<ChatResponse>
  return typeof data.answer === 'string'
    && (data.status === 'SUCCESS' || data.status === 'FAIL')
    && (data.idempotencyKey === null || typeof data.idempotencyKey === 'string')
    && typeof data.attemptCount === 'number'
    && Number.isInteger(data.attemptCount) && data.attemptCount >= 0
    && typeof data.retryable === 'boolean'
}

// 요청 결과와 오류를 화면에 보여줄 값으로 정리합니다. 예외는 던지지 않습니다.
async function settleRequest(request: () => Promise<ChatResponse>): Promise<SettledResult> {
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
    return { response: null, error: '서버 응답을 받지 못했습니다. 연결 상태를 확인해 주세요.', errorCode: null }
  }
}

// 같은 의도의 재검색 결과가 있으면 바꾸고, 없으면 뒤에 추가합니다.
function upsertResearch(turns: ChatTurn[], turnId: number, research: ChatResearch): ChatTurn[] {
  return turns.map((turn) => {
    if (turn.id !== turnId) return turn
    const exists = turn.researches.some((item) => item.intent === research.intent)
    return {
      ...turn,
      researches: exists
        ? turn.researches.map((item) => item.intent === research.intent ? research : item)
        : [...turn.researches, research],
    }
  })
}

// 서버에 닿지 못한 실패(네트워크 오류)만 다시 누를 수 있습니다.
// 서버가 처리한 재검색은 성공·실패와 관계없이 그 의도를 사용한 것으로 보기 때문입니다.
function canResearchAgain(research: ChatResearch) {
  return !research.isPending && research.response === null && research.errorCode === null
}

// 게스트가 로그인하면 서버가 게스트 대화를 회원에게 승계하므로 화면의 대화도 유지합니다.
function keepsConversation(previousUserId: string | null, userId: string | null) {
  return previousUserId === null && userId !== null
}

// 로그인 화면으로 이동해도 대화가 남도록 라우트 바깥에서 채팅 상태를 보관합니다.
export function ChatProvider({ children }: { children: ReactNode }) {
  const { user, isInitializing } = useAuth()
  const userId = user?.id ?? null
  const [state, setState] = useState<ChatState>({ userId, turns: [], error: null })
  const nextTurnId = useRef(0)
  const previousUserId = useRef(userId)
  // 대화를 비울 때마다 바뀌며, 비우기 전에 보낸 요청의 늦은 응답을 걸러냅니다.
  const conversation = useRef<object>({})
  const activeRequest = useRef<object | null>(null)

  // 로그아웃하거나 계정이 바뀐 렌더에서는 이전 사용자의 대화를 화면에 전달하지 않습니다.
  if (state.userId !== userId) {
    setState(keepsConversation(state.userId, userId)
      ? { ...state, userId, error: null }
      : { userId, turns: [], error: null })
  }

  useEffect(() => {
    if (previousUserId.current === userId) return
    if (!keepsConversation(previousUserId.current, userId)) {
      conversation.current = {}
      activeRequest.current = null
    }
    previousUserId.current = userId
  }, [userId])

  const runRequest = useCallback(async (
    turn: Pick<ChatTurn, 'id' | 'question'>,
    request: () => Promise<ChatResponse>,
  ): Promise<boolean> => {
    if (activeRequest.current) return false
    let error: string | null = null
    if (isInitializing) error = '로그인 상태를 확인하는 중입니다.'
    else if (!turn.question) error = '질문을 입력해 주세요.'
    else if (turn.question.length > 4000) error = '질문은 4,000자 이내로 입력해 주세요.'
    if (error) {
      setState((current) => ({ ...current, error }))
      return false
    }

    // React가 다시 렌더링되기 전의 연속 클릭도 한 요청으로 제한합니다.
    const requestId = {}
    const requestConversation = conversation.current
    activeRequest.current = requestId
    const pendingTurn: ChatTurn = {
      ...turn,
      isPending: true,
      response: null,
      error: null,
      errorCode: null,
      // 재검색은 답변이 성공한 뒤에만 가능하고, 재시도 대상은 실패한 답변뿐이라 항상 비어 있습니다.
      researches: [],
    }
    setState((current) => ({
      ...current,
      error: null,
      turns: current.turns.some((item) => item.id === turn.id)
        ? current.turns.map((item) => item.id === turn.id ? pendingTurn : item)
        : [...current.turns, pendingTurn],
    }))

    const { response, error: responseError, errorCode: responseErrorCode } = await settleRequest(request)

    // 새 대화·로그아웃 후의 응답은 반영하지 않습니다. 서버 작업 취소와는 별개입니다.
    if (conversation.current !== requestConversation) return true
    if (activeRequest.current === requestId) activeRequest.current = null
    setState((current) => ({
      ...current,
      turns: current.turns.map((item) => item.id === turn.id
        ? { ...item, isPending: false, response, error: responseError, errorCode: responseErrorCode }
        : item),
    }))
    return true
  }, [isInitializing])

  const sendQuestion = useCallback((rawQuestion: string) => {
    const question = rawQuestion.trim()
    return runRequest({ id: ++nextTurnId.current, question }, () => chatApi.createQuestion({ question }))
  }, [runRequest])

  // 랭킹 API는 FAQ ID와 검증된 질문·답변을 함께 내려주므로 AI 생성 요청 없이 바로 대화에 추가합니다.
  const sendFaqAnswer = useCallback((faq: FaqAnswerSelection): Promise<boolean> => {
    const question = faq.question.trim()
    const answer = faq.answer.trim()
    let error: string | null = null
    if (isInitializing) error = '로그인 상태를 확인하는 중입니다.'
    else if (!question || !answer) error = 'FAQ 답변을 확인할 수 없습니다.'
    else if (activeRequest.current) return Promise.resolve(false)

    if (error) {
      setState((current) => ({ ...current, error }))
      return Promise.resolve(false)
    }

    const turn: ChatTurn = {
      id: ++nextTurnId.current,
      faqId: faq.faqId,
      question,
      isPending: false,
      response: { answer, status: 'SUCCESS', idempotencyKey: null, attemptCount: 0, retryable: false },
      error: null,
      errorCode: null,
      researches: [],
    }
    setState((current) => ({ ...current, error: null, turns: [...current.turns, turn] }))
    return Promise.resolve(true)
  }, [isInitializing])

  const retryAnswer = useCallback((turnId: number) => {
    const turn = state.turns.find((item) => item.id === turnId)
    const response = turn?.response
    if (!turn || turn.isPending || response?.status !== 'FAIL' || !response.retryable || !response.idempotencyKey) {
      return Promise.resolve(false)
    }
    const idempotencyKey = response.idempotencyKey
    return runRequest(turn, () => chatApi.retryAnswer(idempotencyKey))
  }, [runRequest, state.turns])

  // 원래 turn의 답변은 그대로 두고, 선택한 의도의 결과만 turn.researches에 반영합니다.
  const researchAnswer = useCallback(async (
    turnId: number,
    intent: ChatIntent,
    location?: ChatLocation,
  ): Promise<boolean> => {
    if (activeRequest.current) return false
    const turn = state.turns.find((item) => item.id === turnId)
    const original = turn?.response
    if (!turn || turn.isPending || original?.status !== 'SUCCESS' || !original.idempotencyKey) return false
    const used = turn.researches.find((item) => item.intent === intent)
    if (used && !canResearchAgain(used)) return false

    let error: string | null = null
    if (isInitializing) error = '로그인 상태를 확인하는 중입니다.'
    else if (userId === null) error = '로그인 후 이용할 수 있습니다.'
    if (error) {
      setState((current) => ({ ...current, error }))
      return false
    }

    const idempotencyKey = original.idempotencyKey
    // 위도·경도는 함께 있을 때만 보냅니다.
    const body: ChatResearchRequest = location
      ? { intent, latitude: location.latitude, longitude: location.longitude }
      : { intent }

    // React가 다시 렌더링되기 전의 연속 클릭도 한 요청으로 제한합니다.
    const requestId = {}
    const requestConversation = conversation.current
    activeRequest.current = requestId
    setState((current) => ({
      ...current,
      error: null,
      turns: upsertResearch(current.turns, turnId, {
        intent,
        isPending: true,
        response: null,
        error: null,
        errorCode: null,
      }),
    }))

    const result = await settleRequest(() => chatApi.researchAnswer(idempotencyKey, body))

    // 새 대화·로그아웃 후의 응답은 반영하지 않습니다. 서버 작업 취소와는 별개입니다.
    if (conversation.current !== requestConversation) return true
    if (activeRequest.current === requestId) activeRequest.current = null
    setState((current) => ({
      ...current,
      turns: upsertResearch(current.turns, turnId, { intent, isPending: false, ...result }),
    }))
    return true
  }, [isInitializing, state.turns, userId])

  const resetConversation = useCallback(() => {
    conversation.current = {}
    activeRequest.current = null
    setState((current) => ({ userId: current.userId, turns: [], error: null }))
  }, [])

  const value = useMemo<ChatContextValue>(() => ({
    turns: state.turns,
    isPending: state.turns.some((turn) => turn.isPending || turn.researches.some((item) => item.isPending)),
    error: state.error,
    sendQuestion,
    sendFaqAnswer,
    retryAnswer,
    researchAnswer,
    resetConversation,
  }), [researchAnswer, resetConversation, retryAnswer, sendFaqAnswer, sendQuestion, state.error, state.turns])

  return <ChatContext value={value}>{children}</ChatContext>
}