import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../../auth/hooks/useAuth'
import { ApiRequestError } from '../../../shared/api/client'
import { chatApi } from '../api/chatApi'
import type { ChatWaitOptions } from '../api/chatJobPolling'
import {
  canResearchAgain,
  keepsConversation,
  settleRequest,
  updateProgress,
  updateResearchProgress,
  upsertResearch,
} from '../state/chatTransitions'
import type {
  ChatIntent,
  ChatLocation,
  ChatResearchRequest,
  ChatResponse,
  ChatTurn,
  FaqAnswerSelection,
} from '../types/chat'
import { ChatContext, type ChatContextValue } from './ChatContext'
import { ChatSendContext } from './ChatSendContext'

const MAX_CHAT_ATTEMPTS = 3

interface ActiveRequest {
  turnId?: number
  controller?: AbortController
  conversation?: AbortController
  jobId?: number
  cancelRequested?: boolean
  cancelInFlight?: Promise<void>
}

interface ChatState {
  userId: string | null
  conversationId: string | null
  turns: ChatTurn[]
  error: string | null
}

// 로그인 화면으로 이동해도 대화가 남도록 라우트 바깥에서 채팅 상태를 보관합니다.
export function ChatProvider({ children }: { children: ReactNode }) {
  const { user, isInitializing } = useAuth()
  const userId = user?.id ?? null
  const [state, setState] = useState<ChatState>({
    userId,
    conversationId: null,
    turns: [],
    error: null,
  })
  const nextTurnId = useRef(0)
  const previousUserId = useRef(userId)
  // 대화를 비울 때마다 바뀌며, 비우기 전에 보낸 요청의 늦은 응답을 걸러냅니다.
  // 바꿀 때 이전 값을 abort해 답변 상태 조회도 멈춥니다. 서버 작업은 계속됩니다.
  const conversation = useRef(new AbortController())
  const activeRequest = useRef<ActiveRequest | null>(null)

  // 로그아웃하거나 계정이 바뀐 렌더에서는 이전 사용자의 대화를 화면에 전달하지 않습니다.
  if (state.userId !== userId) {
    setState(
      keepsConversation(state.userId, userId)
        ? { ...state, userId, error: null }
        : { userId, conversationId: null, turns: [], error: null },
    )
  }

  useEffect(() => {
    if (previousUserId.current === userId) return
    if (!keepsConversation(previousUserId.current, userId)) {
      conversation.current.abort()
      conversation.current = new AbortController()
      activeRequest.current = null
    }
    previousUserId.current = userId
  }, [userId])

  const cancelServerRequest = useCallback(async (request: ActiveRequest): Promise<void> => {
    if (request.jobId === undefined) return
    if (request.cancelInFlight) return request.cancelInFlight
    const jobId = request.jobId
    request.cancelInFlight = (async () => {
      try {
        const result = await chatApi.cancelJob(jobId)
        if (activeRequest.current !== request || conversation.current !== request.conversation)
          return
        if (result.cancelled) {
          activeRequest.current = null
          request.controller?.abort()
          setState((current) => ({
            ...current,
            turns: current.turns.map((turn) =>
              turn.id === request.turnId
                ? {
                    ...turn,
                    isPending: false,
                    isCancelling: false,
                    isCancelled: true,
                    cancelError: null,
                    progress: null,
                    response: null,
                    error: null,
                    errorCode: null,
                  }
                : turn,
            ),
          }))
        } else {
          // 완료가 먼저 확정됐으면 진행 중인 조회가 기존 답변·거절 결과를 받도록 둡니다.
          setState((current) => ({
            ...current,
            turns: current.turns.map((turn) =>
              turn.id === request.turnId ? { ...turn, isCancelling: false } : turn,
            ),
          }))
        }
      } catch {
        if (activeRequest.current !== request || conversation.current !== request.conversation)
          return
        // 서버 취소를 확인하지 못했을 때 중단 완료로 표시하거나 새 재시도를 만들지 않습니다.
        setState((current) => ({
          ...current,
          turns: current.turns.map((turn) =>
            turn.id === request.turnId
              ? {
                  ...turn,
                  isCancelling: false,
                  cancelError: '중단 요청을 확인하지 못했습니다. 답변 상태를 계속 확인합니다.',
                }
              : turn,
          ),
        }))
      } finally {
        request.cancelInFlight = undefined
      }
    })()
    return request.cancelInFlight
  }, [])

  const runRequest = useCallback(
    async (
      turn: Pick<ChatTurn, 'id' | 'question'>,
      request: (options: ChatWaitOptions) => Promise<ChatResponse>,
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
      const requestConversation = conversation.current
      const requestId: ActiveRequest = {
        turnId: turn.id,
        controller: new AbortController(),
        conversation: requestConversation,
      }
      activeRequest.current = requestId
      const pendingTurn: ChatTurn = {
        ...turn,
        isPending: true,
        isCancelled: false,
        isCancelling: false,
        cancelError: null,
        progress: null,
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
          ? current.turns.map((item) => (item.id === turn.id ? pendingTurn : item))
          : [...current.turns, pendingTurn],
      }))

      const options: ChatWaitOptions = {
        signal: AbortSignal.any([requestConversation.signal, requestId.controller!.signal]),
        onSubmitted: async (submission) => {
          requestId.jobId = submission.jobId
          if (activeRequest.current === requestId && conversation.current === requestConversation) {
            setState((current) => ({
              ...current,
              conversationId: submission.conversationId ?? current.conversationId,
            }))
          }
          if (requestId.cancelRequested) await cancelServerRequest(requestId)
        },
        onProgress: (progress) => {
          if (conversation.current !== requestConversation || activeRequest.current !== requestId)
            return
          setState((current) => ({
            ...current,
            turns: updateProgress(current.turns, turn.id, progress),
          }))
        },
      }
      let result = await settleRequest(() => request(options))
      const idempotencyKey = result.response?.idempotencyKey

      // 재시도 가능한 최종 실패에만 기존 API를 사용하며 같은 질문의 멱등키를 유지합니다.
      for (let requestCount = 1; requestCount < MAX_CHAT_ATTEMPTS; requestCount += 1) {
        if (conversation.current !== requestConversation || activeRequest.current !== requestId)
          return true
        if (requestId.cancelRequested) {
          await requestId.cancelInFlight
          break
        }
        const response = result.response
        if (
          response?.status !== 'FAIL' ||
          !response.retryable ||
          !idempotencyKey ||
          response.attemptCount < 1 ||
          response.attemptCount >= MAX_CHAT_ATTEMPTS
        )
          break
        setState((current) => ({
          ...current,
          turns: current.turns.map((item) =>
            item.id === turn.id
              ? { ...item, response, progress: null, error: null, errorCode: null }
              : item,
          ),
        }))
        result = await settleRequest(() => chatApi.retryAnswer(idempotencyKey, options))
      }

      const { response, error: responseError, errorCode: responseErrorCode } = result
      // 중단·새 대화·로그아웃 후의 응답은 반영하지 않습니다. 서버 작업 취소와는 별개입니다.
      if (conversation.current !== requestConversation || activeRequest.current !== requestId)
        return true
      if (activeRequest.current === requestId) activeRequest.current = null
      setState((current) => ({
        ...current,
        conversationId: response?.conversationId ?? current.conversationId,
        turns: current.turns.map((item) =>
          item.id === turn.id
            ? {
                ...item,
                isPending: false,
                isCancelling: false,
                progress: null,
                response,
                error: responseError,
                errorCode: responseErrorCode,
              }
            : item,
        ),
      }))
      return true
    },
    [isInitializing, cancelServerRequest],
  )

  const cancelQuestion = useCallback(() => {
    const request = activeRequest.current
    if (request?.turnId === undefined) return
    request.cancelRequested = true
    setState((current) => ({
      ...current,
      turns: current.turns.map((turn) =>
        turn.id === request.turnId ? { ...turn, isCancelling: true, cancelError: null } : turn,
      ),
    }))
    // 접수 전에는 onSubmitted가 뒤늦은 jobId를 받아 같은 중단을 이어갑니다.
    void cancelServerRequest(request)
  }, [cancelServerRequest])

  const sendQuestion = useCallback(
    (rawQuestion: string) => {
      const question = rawQuestion.trim()
      const conversationId = state.conversationId ?? undefined
      return runRequest({ id: ++nextTurnId.current, question }, (options) =>
        chatApi.createQuestion({ question, conversationId }, options),
      )
    },
    [runRequest, state.conversationId],
  )

  // 랭킹 API는 FAQ ID와 검증된 질문·답변을 함께 내려주므로 AI 생성 요청 없이 바로 대화에 추가합니다.
  const sendFaqAnswer = useCallback(
    (faq: FaqAnswerSelection): Promise<boolean> => {
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
        response: {
          answer,
          status: 'SUCCESS',
          idempotencyKey: null,
          attemptCount: 0,
          retryable: false,
        },
        error: null,
        errorCode: null,
        researches: [],
      }
      setState((current) => ({ ...current, error: null, turns: [...current.turns, turn] }))
      return Promise.resolve(true)
    },
    [isInitializing],
  )

  // 원래 turn의 답변은 그대로 두고, 선택한 의도의 결과만 turn.researches에 반영합니다.
  const researchAnswer = useCallback(
    async (turnId: number, intent: ChatIntent, location?: ChatLocation): Promise<boolean> => {
      if (activeRequest.current) return false
      const turn = state.turns.find((item) => item.id === turnId)
      const original = turn?.response
      if (!turn || turn.isPending || original?.status !== 'SUCCESS' || !original.idempotencyKey)
        return false
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
          progress: null,
          response: null,
          error: null,
          errorCode: null,
        }),
      }))

      const result = await settleRequest(() =>
        chatApi.researchAnswer(idempotencyKey, body, {
          signal: requestConversation.signal,
          onProgress: (progress) => {
            if (conversation.current !== requestConversation) return
            setState((current) => ({
              ...current,
              turns: updateResearchProgress(current.turns, turnId, intent, progress),
            }))
          },
        }),
      )

      // 새 대화·로그아웃 후의 응답은 반영하지 않습니다. 서버 작업 취소와는 별개입니다.
      if (conversation.current !== requestConversation) return true
      if (activeRequest.current === requestId) activeRequest.current = null
      setState((current) => ({
        ...current,
        turns: upsertResearch(current.turns, turnId, {
          intent,
          isPending: false,
          progress: null,
          ...result,
        }),
      }))
      return true
    },
    [isInitializing, state.turns, userId],
  )

  const resetConversation = useCallback(() => {
    conversation.current.abort()
    conversation.current = new AbortController()
    activeRequest.current = null
    setState((current) => ({
      userId: current.userId,
      conversationId: null,
      turns: [],
      error: null,
    }))
  }, [])

  const openConversation = useCallback(async (conversationId: string) => {
    if (activeRequest.current) return false
    const requestConversation = new AbortController()
    conversation.current.abort()
    conversation.current = requestConversation
    try {
      const messages = await chatApi.getConversationMessageList(conversationId)
      if (conversation.current !== requestConversation) return false
      const turns: ChatTurn[] = messages.map((message) => ({
        id: ++nextTurnId.current,
        question: message.question,
        isPending: false,
        response: {
          answer: message.answer,
          status: 'SUCCESS',
          idempotencyKey: null,
          attemptCount: 0,
          retryable: false,
        },
        error: null,
        errorCode: null,
        researches: [],
      }))
      setState((current) => ({ ...current, conversationId, turns, error: null }))
      return true
    } catch (cause) {
      if (conversation.current !== requestConversation) return false
      const error = cause instanceof ApiRequestError ? cause.message : '대화를 불러오지 못했습니다.'
      setState((current) => ({ ...current, error }))
      return false
    }
  }, [])

  const value = useMemo<ChatContextValue>(
    () => ({
      turns: state.turns,
      conversationId: state.conversationId,
      isPending: state.turns.some(
        (turn) => turn.isPending || turn.researches.some((item) => item.isPending),
      ),
      error: state.error,
      sendQuestion,
      sendFaqAnswer,
      cancelQuestion,
      researchAnswer,
      resetConversation,
      openConversation,
    }),
    [
      cancelQuestion,
      openConversation,
      researchAnswer,
      resetConversation,
      sendFaqAnswer,
      sendQuestion,
      state.conversationId,
      state.error,
      state.turns,
    ],
  )

  return (
    <ChatSendContext value={sendQuestion}>
      <ChatContext value={value}>{children}</ChatContext>
    </ChatSendContext>
  )
}
