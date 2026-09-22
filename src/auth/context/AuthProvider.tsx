import { type ReactNode, useEffect, useMemo, useState } from 'react'
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

      try {
        const tokens = await authApi.refresh({ refreshToken })
        const restoredUser = getAuthUser(tokens.accessToken)
        if (!restoredUser) throw new Error('유효하지 않은 로그인 정보입니다.')
        tokenStorage.setTokens(tokens)
        setUser(restoredUser)
      } catch {
        tokenStorage.clear()
      } finally {
        setIsInitializing(false)
      }
    }

    void restoreSession()
  }, [])

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
      } finally {
        tokenStorage.clear()
        setUser(null)
      }
    },
  }), [isInitializing, user])

  return <AuthContext value={value}>{children}</AuthContext>
}
