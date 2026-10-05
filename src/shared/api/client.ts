import type { LoginResponse } from '../../auth/types/auth';
import { tokenStorage } from '../../auth/utils/tokenStorage';
import type { ApiResponse } from '../types/api';

const apiBaseUrl =
  (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')// 현재 바뀐 api 규칙대로 통일하기위한 변경입니다
const EXPIRED_ACCESS_TOKEN_CODE = 'JWT-007';
// JWT-004: 유효하지 않은 access token, JWT-005: 삭제된 유저의 토큰
const REJECTED_ACCESS_TOKEN_CODES = new Set(['JWT-004', 'JWT-005']);
// authApi.refresh와 같은 경로입니다. authApi가 이 파일을 import하므로 순환 참조를 피하려고 직접 호출합니다.
const REFRESH_PATH = '/api/auth/refresh';

export class ApiRequestError extends Error {
  readonly code?: string;
  readonly status: number;
  readonly data?: unknown;

  constructor(message: string, status: number, code?: string, data?: unknown) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

export type RefreshResult = 'refreshed' | 'expired' | 'failed';

let refreshPromise: Promise<RefreshResult> | null = null;
const sessionExpiredListeners = new Set<() => void>();

/** refresh token까지 거절되어 토큰을 지웠을 때 호출됩니다. 반환값으로 구독을 해제합니다. */
export function onSessionExpired(listener: () => void) {
  sessionExpiredListeners.add(listener);
  return () => {
    sessionExpiredListeners.delete(listener);
  };
}

// BE가 재발급할 때마다 refresh token을 교체하므로, 동시에 재발급이 필요한 곳들이 같은 요청 결과를 기다리게 합니다.
// 두 번 보내면 브라우저와 DB의 refresh token이 어긋나 다음 재발급이 실패합니다.
export function refreshTokens(): Promise<RefreshResult> {
  refreshPromise ??= (async (): Promise<RefreshResult> => {
    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) return 'expired';

    try {
      const tokens = await send<LoginResponse>(REFRESH_PATH, {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }, false);
      tokenStorage.setTokens(tokens);
      return 'refreshed';
    } catch (error) {
      // 토큰이 거절된 경우만 세션 만료로 봅니다. 네트워크·서버 오류로 로그아웃시키지 않습니다.
      return error instanceof ApiRequestError && (error.status === 400 || error.status === 401) ? 'expired' : 'failed';
    }
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

async function request<T>(path: string, init: RequestInit = {}, withAuth = true): Promise<T> {
  try {
    return await send<T>(path, init, withAuth);
  } catch (error) {
    if (!withAuth || !(error instanceof ApiRequestError)) throw error;

    // 유효하지 않거나 탈퇴한 계정의 토큰은 재발급으로 고칠 수 없으므로 지우고 로그아웃 상태로 돌립니다.
    if (error.code !== undefined && REJECTED_ACCESS_TOKEN_CODES.has(error.code)) {
      tokenStorage.clear();
      sessionExpiredListeners.forEach((listener) => listener());
      throw error;
    }
    if (error.code !== EXPIRED_ACCESS_TOKEN_CODE) throw error;

    const result = await refreshTokens();
    if (result === 'refreshed') return send<T>(path, init, withAuth);
    if (result === 'expired') {
      tokenStorage.clear();
      sessionExpiredListeners.forEach((listener) => listener());
    }
    throw error;
  }
}

async function send<T>(path: string, init: RequestInit, withAuth: boolean): Promise<T> {
  const accessToken = withAuth ? tokenStorage.getAccessToken() : null;
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init.headers,
    },
  });

  if (response.status === 204) return undefined as T;

  const body = (await response.json().catch(() => null)) as ApiResponse<T> | null;

  if (!response.ok || !body?.success) {
    throw new ApiRequestError(body?.message || '요청을 처리하지 못했습니다.', response.status, body?.code, body?.data);
  }

  return body.data;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown, withAuth = true, headers?: Record<string, string>) => request<T>(path, {
    method: 'POST',
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    ...(headers === undefined ? {} : { headers }),
  }, withAuth),
  patch: <T>(path: string, data: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
