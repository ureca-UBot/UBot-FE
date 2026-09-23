import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { onSessionExpired, refreshTokens } from '../../shared/api/client'
import { authApi } from '../api/authApi'
import type { AuthUser } from '../types/auth'
import { getAuthUser, isAccessTokenExpired } from '../utils/decodeAccessToken'
import { tokenStorage } from '../utils/tokenStorage'
import { AuthContext, type AuthContextValue } from './AuthContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)

  useEffect(() => {
    async function restoreSession() {
      const accessToken = tokenStorage.getAccessToken()
      const refreshToken = tokenStorage.getRefreshToken()

      if (accessToken && !isAccessTokenExpired(accessToken)) {
        const restoredUser = getAuthUser(accessToken)
        if (restoredUser) setUser(restoredUser)
        else tokenStorage.clear()
        setIsInitializing(false)
        return
      }

      if (!refreshToken) {
        tokenStorage.clear()
        setIsInitializing(false)
        return
      }

      // StrictMode에서 이 effect가 두 번 실행돼도 refresh 요청은 한 번만 나가도록 apiClient의 재발급을 함께 씁니다.
      const result = await refreshTokens()
      const newAccessToken = result === 'refreshed' ? tokenStorage.getAccessToken() : null
      const restoredUser = newAccessToken ? getAuthUser(newAccessToken) : null
      if (restoredUser) setUser(restoredUser)
      // 네트워크·서버 오류('failed')면 토큰을 남겨 두고 다음 접속 때 다시 시도합니다.
      else if (result !== 'failed') tokenStorage.clear()
      setIsInitializing(false)
    }

    void restoreSession()
  }, [])

  // 사용 중 access token 재발급까지 실패하면 apiClient가 토큰을 지우고 알려줍니다.
  useEffect(() => onSessionExpired(() => setUser(null)), [])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isInitializing,
    login: async (request) => {
      const tokens = await authApi.login(request)
      const loggedInUser = getAuthUser(tokens.accessToken)
      if (!loggedInUser) throw new Error('유효하지 않은 로그인 정보입니다.')
      tokenStorage.setTokens(tokens)
      setUser(loggedInUser)
      return loggedInUser
    },
    logout: async () => {
      try {
        await authApi.logout()
      } catch {
        // 서버에서 refresh token을 지우지 못해도 이 브라우저의 로그인 정보는 지웁니다.
      } finally {
        tokenStorage.clear()
        setUser(null)
      }
    },
  }), [isInitializing, user])

  return <AuthContext value={value}>{children}</AuthContext>
}
