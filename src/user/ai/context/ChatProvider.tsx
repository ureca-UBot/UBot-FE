import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../../auth/hooks/useAuth'
import { ApiRequestError } from '../../../shared/api/client'
import { chatApi } from '../api/chatApi'
import { saveFaqSelection, type FaqSelectionRequest } from '../api/faqSelectionApi'
import type { ChatWaitOptions } from '../api/chatJobPolling'
import {
  canResearchAgain,
  canResearchTurn,
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
import { locationAwareQuestion } from '../utils/locationAwareQuestion'

const MAX_CHAT_ATTEMPTS = 3

interface ActiveRequest {
  turnId?: number
  controller?: AbortController
  conversation?: AbortController
  jobId?: number
  cancelRequested?: boolean
  cancelInFlight?: Promise<void>
  waitingForLocation?: boolean
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
  const pendingFaq = useRef<FaqSelectionRequest | null>(null)
  const conversationLocked = useRef(false)
  const [isConversationLocked, setIsConversationLocked] = useState(false)
  const setConversationLocked = useCallback((locked: boolean) => {
    conversationLocked.current = locked
    setIsConversationLocked(locked)
  }, [])

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
      pendingFaq.current = null
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
      turn: Pick<ChatTurn, 'id' | 'question'> & Partial<Pick<ChatTurn, 'researches'>>,
      request: (options: ChatWaitOptions) => Promise<ChatResponse>,
    ): Promise<boolean> => {
      if (activeRequest.current || conversationLocked.current) return false
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
        isLocating: false,
        isCancelled: false,
        isCancelling: false,
        cancelError: null,
        progress: null,
        response: null,
        error: null,
        errorCode: null,
        // 위치 허용 후 같은 질문을 이어갈 때는 기존 의도별 결과를 유지합니다.
        researches: turn.researches ?? [],
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
                isLocating: false,
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
    if (request.waitingForLocation) {
      activeRequest.current = null
      request.controller?.abort()
      setState((current) => ({
        ...current,
        turns: current.turns.map((turn) =>
          turn.id === request.turnId
            ? {
                ...turn,
                isPending: false,
                isLocating: false,
                isCancelled: true,
                isCancelling: false,
                progress: null,
              }
            : turn,
        ),
      }))
      return
    }
    setState((current) => ({
      ...current,
      turns: current.turns.map((turn) =>
        turn.id === request.turnId ? { ...turn, isCancelling: true, cancelError: null } : turn,
      ),
    }))
    // 접수 전에는 onSubmitted가 뒤늦은 jobId를 받아 같은 중단을 이어갑니다.
    void cancelServerRequest(request)
  }, [cancelServerRequest])

  const locationQuestion = useCallback(
    (
      question: string,
      turnId: number,
      conversationId: string | undefined,
      options: ChatWaitOptions,
      previous?: ChatResponse,
    ) => {
      const request = activeRequest.current
      return locationAwareQuestion(
        { question, conversationId },
        options,
        (locating) => {
          if (activeRequest.current !== request) return
          if (request) {
            request.waitingForLocation = locating
            if (locating) request.jobId = undefined
          }
          setState((current) => ({
            ...current,
            turns: current.turns.map((turn) =>
              turn.id === turnId
                ? { ...turn, isLocating: locating, progress: locating ? null : turn.progress }
                : turn,
            ),
          }))
        },
        previous,
      )
    },
    [],
  )

  const sendQuestion = useCallback(
    (rawQuestion: string, targetConversationId?: string) => {
      const question = rawQuestion.trim()
      const conversationId = targetConversationId ?? state.conversationId ?? undefined
      const id = ++nextTurnId.current
      return runRequest({ id, question }, (options) =>
        locationQuestion(question, id, conversationId, options),
      )
    },
    [runRequest, state.conversationId, locationQuestion],
  )

  const requestStoreLocation = useCallback(
    (turnId: number) => {
      const turn = state.turns.find((item) => item.id === turnId)
      const previous = turn?.response
      if (!turn || !previous?.store?.locationRequired) return Promise.resolve(false)
      return runRequest(
        { id: turn.id, question: turn.question, researches: turn.researches },
        (options) =>
          locationQuestion(
            turn.question,
            turn.id,
            previous.conversationId ?? state.conversationId ?? undefined,
            options,
            previous,
          ),
      )
    },
    [state.turns, state.conversationId, runRequest, locationQuestion],
  )

  // 회원의 FAQ 선택은 서버에 저장한 원문을 표시함. 비회원은 화면에서만 확인함
  const sendFaqAnswer = useCallback(
    async (faq: FaqAnswerSelection, targetConversationId?: string): Promise<boolean> => {
      const question = faq.question.trim()
      const answer = faq.answer.trim()
      let error: string | null = null
      if (isInitializing) error = '로그인 상태를 확인하는 중입니다.'
      else if (!question || !answer) error = 'FAQ 답변을 확인할 수 없습니다.'
      else if (activeRequest.current || conversationLocked.current) return false

      if (error) {
        setState((current) => ({ ...current, error }))
        return false
      }

      const turn: ChatTurn = {
        id: ++nextTurnId.current,
        faqId: faq.faqId,
        question,
        isPending: Boolean(userId),
        response: userId
          ? null
          : { answer, status: 'SUCCESS', idempotencyKey: null, attemptCount: 0, retryable: false },
        error: null,
        errorCode: null,
        researches: [],
      }
      const requestId = {}
      const requestConversation = conversation.current
      if (userId) activeRequest.current = requestId
      setState((current) => ({ ...current, error: null, turns: [...current.turns, turn] }))
      if (!userId) return true
      const conversationId = targetConversationId ?? state.conversationId
      if (
        pendingFaq.current?.faqId !== faq.faqId ||
        pendingFaq.current?.conversationId !== conversationId
      ) {
        pendingFaq.current = { selectionId: crypto.randomUUID(), conversationId, faqId: faq.faqId }
      }
      try {
        const saved = await saveFaqSelection(pendingFaq.current)
        if (conversation.current !== requestConversation) return true
        pendingFaq.current = null
        setState((current) => ({
          ...current,
          conversationId: saved.conversationId,
          turns: current.turns.map((item) =>
            item.id === turn.id
              ? {
                  ...item,
                  question: saved.question,
                  isPending: false,
                  response: {
                    answer: saved.answer,
                    status: 'SUCCESS',
                    idempotencyKey: null,
                    attemptCount: 0,
                    retryable: false,
                  },
                }
              : item,
          ),
        }))
      } catch (cause) {
        if (conversation.current !== requestConversation) return true
        if (cause instanceof ApiRequestError && cause.status >= 400 && cause.status < 500)
          pendingFaq.current = null
        const error =
          cause instanceof Error
            ? cause.message
            : 'FAQ 선택을 저장하지 못했습니다. 다시 선택해 주세요.'
        setState((current) => ({
          ...current,
          error,
          turns: current.turns.filter((item) => item.id !== turn.id),
        }))
      } finally {
        if (activeRequest.current === requestId) activeRequest.current = null
      }
      return true
    },
    [isInitializing, state.conversationId, userId],
  )

  // 원래 turn의 답변은 그대로 두고, 선택한 의도의 결과만 turn.researches에 반영합니다.
  const researchAnswer = useCallback(
    async (turnId: number, intent: ChatIntent, location?: ChatLocation): Promise<boolean> => {
      if (activeRequest.current || conversationLocked.current) return false
      const turn = state.turns.find((item) => item.id === turnId)
      const original = turn?.response
      if (!turn || !canResearchTurn(turn) || !original?.idempotencyKey) return false
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

  const replaceConversation = useCallback((conversationId: string | null) => {
    conversation.current.abort()
    conversation.current = new AbortController()
    activeRequest.current = null
    pendingFaq.current = null
    setState((current) => ({
      userId: current.userId,
      conversationId,
      turns: [],
      error: null,
    }))
  }, [])

  const resetConversation = useCallback(() => {
    if (conversationLocked.current) return
    replaceConversation(null)
  }, [replaceConversation])

  const startCounselConversation = useCallback(
    (conversationId: string) => {
      if (activeRequest.current) return
      replaceConversation(conversationId)
    },
    [replaceConversation],
  )

  const openConversation = useCallback(async (conversationId: string) => {
    if (activeRequest.current || conversationLocked.current) return false
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
      isConversationLocked,
      isPending: state.turns.some(
        (turn) => turn.isPending || turn.researches.some((item) => item.isPending),
      ),
      error: state.error,
      sendQuestion,
      requestStoreLocation,
      sendFaqAnswer,
      cancelQuestion,
      researchAnswer,
      resetConversation,
      startCounselConversation,
      openConversation,
      setConversationLocked,
    }),
    [
      cancelQuestion,
      openConversation,
      setConversationLocked,
      researchAnswer,
      isConversationLocked,
      resetConversation,
      startCounselConversation,
      sendFaqAnswer,
      sendQuestion,
      requestStoreLocation,
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
