import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../../auth/hooks/useAuth'
import { ApiRequestError } from '../../shared/api/client'
import type { ChatContextValue } from '../../user/ai/context/ChatContext'
import { counselApi } from '../api/counselApi'
import { counselConfig } from '../config/counselConfig'
import type { HandoffRequest, Session } from '../types/counsel'

export const counselStates = {
  WAITING: '상담사를 기다리고 있어요',
  ACTIVE: '상담사와 연결되었어요',
  PAUSED: '상담사 재연결을 기다리고 있어요',
  ENDED: '상담이 종료되었어요',
}

// AiPage는 계정별로 다시 마운트되며, 새로고침 사이에는 상담 ID만 보관함
export function useCustomerCounsel(chat?: ChatContextValue) {
  const { user, isInitializing } = useAuth()
  const enabled = Boolean(chat && user?.role === 'USER' && !isInitializing && counselConfig.enabled)
  const storageKey = `counsel:session:${user?.id ?? ''}`
  const [session, setSession] = useState<Session | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [checkedConversation, setCheckedConversation] = useState<string | null | undefined>(
    undefined,
  )
  const [uncertain, setUncertain] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const alive = useRef(true)
  const operation = useRef(false)
  const revision = useRef(0)
  const latest = useRef<Session | null>(null)
  const pendingRequest = useRef<HandoffRequest | null>(null)
  const conversationId = chat?.conversationId ?? null
  const ended = session?.status === 'ENDED'
  const loading = enabled && (!loaded || checkedConversation !== conversationId)
  const blocking = enabled && (loading || busy || uncertain || Boolean(session && !ended))

  const apply = useCallback(
    (value: Session | null) => {
      latest.current = value
      setSession(value)
      if (value) sessionStorage.setItem(storageKey, value.sessionId)
    },
    [storageKey],
  )

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  const setLocked = chat?.setConversationLocked
  useEffect(() => {
    setLocked?.(blocking)
    return () => setLocked?.(false)
  }, [blocking, setLocked])

  useEffect(() => {
    if (!enabled) return
    let stopped = false
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout>
    let first = true
    async function poll() {
      const version = revision.current
      let repeat = true
      try {
        let current = await counselApi.current(controller.signal)
        if (!current && first && conversationId)
          current = await counselApi.conversationSession(conversationId, controller.signal)
        if (!current && first && !conversationId && !latest.current) {
          const restoredId = sessionStorage.getItem(storageKey)
          if (restoredId) {
            try {
              current = await counselApi.session(restoredId, controller.signal)
            } catch (e) {
              if (e instanceof ApiRequestError && [403, 404].includes(e.status))
                sessionStorage.removeItem(storageKey)
              else throw e
            }
          }
        }
        if (stopped || version !== revision.current || operation.current) return
        const prior = latest.current
        // 진행 중이던 상담이 목록에서 빠지면 상태를 추정하지 않고 서버의 마지막 상태를 받음
        if (!current && prior && (!conversationId || conversationId === prior.conversationId)) {
          current =
            prior.status === 'ENDED'
              ? prior
              : await counselApi.session(prior.sessionId, controller.signal)
          if (stopped || version !== revision.current || operation.current) return
        }
        apply(current)
        if (current) {
          pendingRequest.current = null
          setUncertain(false)
        }
        repeat = current?.status !== 'ENDED'
        first = false
        setError('')
      } catch (e) {
        if (!stopped) setError(e instanceof Error ? e.message : '상담 상태를 불러오지 못했습니다.')
      } finally {
        if (!stopped) {
          setLoaded(true)
          setCheckedConversation(conversationId)
          if (repeat) timer = setTimeout(poll, counselConfig.pollIntervalMs)
        }
      }
    }
    void poll()
    return () => {
      stopped = true
      controller.abort()
      clearTimeout(timer)
    }
  }, [enabled, conversationId, refresh, storageKey, apply])

  async function requestCounsel() {
    if (
      !enabled ||
      !chat ||
      loading ||
      operation.current ||
      chat.isPending ||
      (latest.current && latest.current.status !== 'ENDED')
    )
      return
    operation.current = true
    revision.current++
    setBusy(true)
    setError('')
    chat.setConversationLocked(true)
    try {
      // 응답 유실 시 같은 ID를 재사용함. 문답 본문은 보내지 않고 서버에서 조회함
      pendingRequest.current ??= {
        handoffId: crypto.randomUUID(),
        conversationId: latest.current?.conversationId ?? chat.conversationId,
      }
      const created = await counselApi.request(pendingRequest.current)
      if (!alive.current) return
      apply(created)
      pendingRequest.current = null
      setUncertain(false)
      setRefresh((value) => value + 1)
    } catch (e) {
      const rejected =
        e instanceof ApiRequestError && [400, 401, 403, 404, 409, 413].includes(e.status)
      if (rejected) pendingRequest.current = null
      if (alive.current) {
        setUncertain(!rejected)
        setError(e instanceof Error ? e.message : '상담 요청에 실패했습니다.')
      }
    } finally {
      operation.current = false
      revision.current++
      if (alive.current) setBusy(false)
    }
  }
  async function endCounsel() {
    if (operation.current || !latest.current) return
    operation.current = true
    revision.current++
    setBusy(true)
    try {
      const result = await counselApi.end(latest.current.sessionId)
      if (alive.current) {
        apply(result)
        setError('')
        setRefresh((value) => value + 1)
      }
    } catch (e) {
      if (alive.current) setError(e instanceof Error ? e.message : '종료 요청에 실패했습니다.')
    } finally {
      operation.current = false
      revision.current++
      if (alive.current) setBusy(false)
    }
  }
  function clear() {
    if (blocking) return
    revision.current++
    pendingRequest.current = null
    sessionStorage.removeItem(storageKey)
    apply(null)
    setRefresh((value) => value + 1)
  }
  return {
    session,
    loading,
    busy,
    blocking,
    uncertain,
    error,
    enabled,
    requestCounsel,
    endCounsel,
    clear,
    userId: user?.id ?? '',
  }
}
