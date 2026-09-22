import { createContext } from 'react'
import type { AuthUser, LoginRequest } from '../types/auth'

export interface AuthContextValue {
  user: AuthUser | null
  isInitializing: boolean
  login: (request: LoginRequest) => Promise<AuthUser>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
