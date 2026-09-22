import { tokenStorage } from '../../auth/utils/tokenStorage'
import type { ApiResponse } from '../types/api'

// 개발 환경에서는 Vite가 /api 요청을 백엔드로 프록시한다.
// 배포 환경에서 API 주소가 다르면 VITE_API_BASE_URL에 지정한다.
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '')

async function request<T>(path: string, init: RequestInit = {}, withAuth = true): Promise<T> {
  const accessToken = withAuth ? tokenStorage.getAccessToken() : null
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init.headers,
    },
  })
  const body = (await response.json().catch(() => null)) as ApiResponse<T> | null

  if (!response.ok || !body?.success) {
    throw new Error(body?.message || '요청을 처리하지 못했습니다.')
  }

  return body.data
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown, withAuth = true) => request<T>(path, {
    method: 'POST',
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  }, withAuth),
  patch: <T>(path: string, data: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
