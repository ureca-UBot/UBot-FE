import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../../../auth/hooks/useAuth'
import { ApiRequestError } from '../../../shared/api/client'
import { chatApi } from '../api/chatApi'
import type { ChatResponse, ChatTurn } from '../types/chat'

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

export function useChat() {
  const { user, isInitializing } = useAuth()
  const userId = user?.id ?? null
  const [state, setState] = useState<ChatState>({ userId, turns: [], error: null })
  const nextTurnId = useRef(0)
  const session = useRef<{ userId: string | null } | null>(null)
  const activeRequest = useRef<object | null>(null)

  // 계정이 바뀐 렌더에서는 이전 사용자의 대화를 화면에 전달하지 않습니다.
  if (state.userId !== userId) setState({ userId, turns: [], error: null })

  useEffect(() => {
    session.current = { userId }
    return () => {
      session.current = null
      activeRequest.current = null
    }
  }, [userId])

  const runRequest = useCallback(async (
    turn: Pick<ChatTurn, 'id' | 'question'>,
    request: () => Promise<ChatResponse>,
  ): Promise<boolean> => {
    if (!session.current || session.current.userId !== userId || activeRequest.current) return false
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
    activeRequest.current = requestId
    const pendingTurn: ChatTurn = { ...turn, isPending: true, response: null, error: null, errorCode: null }
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

    // 새 대화·로그아웃·화면 해제 후의 응답은 반영하지 않습니다. 서버 작업 취소와는 별개입니다.
    if (activeRequest.current !== requestId) return true
    activeRequest.current = null
    setState((current) => current.userId !== userId ? current : {
      ...current,
      turns: current.turns.map((item) => item.id === turn.id
        ? { ...item, isPending: false, response, error: responseError, errorCode: responseErrorCode }
        : item),
    })
    return true
  }, [isInitializing, userId])

  // 반환값은 요청을 시작했는지 나타냅니다. 답변 성공 여부는 각 turn의 결과로 확인합니다.
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
    if (!session.current || session.current.userId !== userId) return
    activeRequest.current = null
    setState({ userId, turns: [], error: null })
  }, [userId])

  return {
    turns: state.turns,
    isPending: state.turns.some((turn) => turn.isPending),
    error: state.error,
    sendQuestion,
    retryAnswer,
    resetConversation,
  }
}
