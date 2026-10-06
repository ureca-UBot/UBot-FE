import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../../auth/hooks/useAuth'
import { ApiRequestError } from '../../../shared/api/client'
import { chatApi } from '../api/chatApi'
import type { ChatResponse, ChatTurn } from '../types/chat'
import { ChatContext, type ChatContextValue } from './ChatContext'

interface ChatState {
  userId: string | null
  turns: ChatTurn[]
  error: string | null
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
    const pendingTurn: ChatTurn = { ...turn, isPending: true, response: null, error: null, errorCode: null, researches: [], }
    setState((current) => ({
      ...current,
      error: null,
      turns: current.turns.some((item) => item.id === turn.id)
        ? current.turns.map((item) => item.id === turn.id ? pendingTurn : item)
        : [...current.turns, pendingTurn],
    }))

    let response: ChatResponse | null = null
    let responseError: string | null = null
    let responseErrorCode: string | null = null
    try {
      const result = await request()
      if (isChatResponse(result)) {
        response = result
        responseError = result.status === 'FAIL' ? result.answer : null
      } else {
        responseError = '서버의 답변 응답을 확인할 수 없습니다.'
      }
    } catch (cause) {
      if (cause instanceof ApiRequestError) {
        responseError = cause.message
        responseErrorCode = cause.code ?? null
        if (isChatResponse(cause.data) && cause.data.status === 'FAIL') response = cause.data
      } else {
        responseError = '서버 응답을 받지 못했습니다. 연결 상태를 확인해 주세요.'
      }
    }

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

  const retryAnswer = useCallback((turnId: number) => {
    const turn = state.turns.find((item) => item.id === turnId)
    const response = turn?.response
    if (!turn || turn.isPending || response?.status !== 'FAIL' || !response.retryable || !response.idempotencyKey) {
      return Promise.resolve(false)
    }
    const idempotencyKey = response.idempotencyKey
    return runRequest(turn, () => chatApi.retryAnswer(idempotencyKey))
  }, [runRequest, state.turns])

  const resetConversation = useCallback(() => {
    conversation.current = {}
    activeRequest.current = null
    setState((current) => ({ userId: current.userId, turns: [], error: null }))
  }, [])

  const value = useMemo<ChatContextValue>(() => ({
    turns: state.turns,
    isPending: state.turns.some((turn) => turn.isPending),
    error: state.error,
    sendQuestion,
    retryAnswer,
    resetConversation,
  }), [resetConversation, retryAnswer, sendQuestion, state.error, state.turns])

  return <ChatContext value={value}>{children}</ChatContext>
}
