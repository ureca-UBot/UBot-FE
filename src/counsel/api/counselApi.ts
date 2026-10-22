import { apiClient } from '../../shared/api/client'
import { counselConfig } from '../config/counselConfig'
import type {
  Session,
  Delivery,
  Receipt,
  Summary,
  EventsPage,
  HandoffRequest,
  HistoryMessage,
} from '../types/counsel'

const base = '/api/counsel'
function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!counselConfig.enabled) return Promise.reject(new Error('상담자 기능은 준비 중입니다.'))
  const timeout = AbortSignal.timeout(counselConfig.requestTimeoutMs)
  return apiClient.request<T>(path, {
    ...init,
    signal: init.signal ? AbortSignal.any([init.signal, timeout]) : timeout,
  })
}
const client = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>(path, { signal }),
  post: <T>(path: string, data?: unknown, signal?: AbortSignal) =>
    request<T>(path, {
      method: 'POST',
      signal,
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    }),
}
export const counselApi = {
  current: (signal?: AbortSignal) => client.get<Session | null>(`${base}/sessions/current`, signal),
  request: (data?: HandoffRequest) => client.post<Session>(`${base}/requests`, data),
  session: (id: string, signal?: AbortSignal) =>
    client.get<Session>(`${base}/sessions/${id}`, signal),
  conversationSession: (id: string, signal?: AbortSignal) =>
    client.get<Session | null>(`${base}/sessions/conversation/${encodeURIComponent(id)}`, signal),
  history: (id: string, after: number, signal?: AbortSignal) =>
    client.get<HistoryMessage[]>(
      `${base}/sessions/${id}/context?afterSequence=${after}&limit=100`,
      signal,
    ),
  end: (id: string) => client.post<Session>(`${base}/sessions/${id}/end`),
  messages: (id: string, after: number, signal?: AbortSignal) =>
    client.get<Delivery[]>(
      `${base}/sessions/${id}/messages?afterSequence=${after}&limit=100`,
      signal,
    ),
  send: (id: string, clientMessageId: string, content: string) =>
    client.post<Receipt>(`${base}/sessions/${id}/messages`, { clientMessageId, content }),
  availability: (status: 'AVAILABLE' | 'OFFLINE') =>
    client.post<{ status: 'AVAILABLE' | 'OFFLINE' }>(`${base}/counselors/availability`, { status }),
  heartbeat: (signal?: AbortSignal) =>
    client.post<{ status: 'AVAILABLE' | 'OFFLINE' }>(
      `${base}/counselors/heartbeat`,
      undefined,
      signal,
    ),
  events: (query: string) => client.get<EventsPage>(`/api/admin/counsel/safety/events?${query}`),
  summary: (query: string) => client.get<Summary>(`/api/admin/counsel/safety/summary?${query}`),
}
