import { apiClient } from '../../shared/api/client'
import type { LoginRequest, LoginResponse, RefreshTokenRequest, SignupRequest } from '../types/auth'

export const authApi = {
  login: (request: LoginRequest) => apiClient.post<LoginResponse>('/api/auth/login', request, false),
  refresh: (request: RefreshTokenRequest) => apiClient.post<LoginResponse>('/api/auth/refresh', request, false),
  logout: () => apiClient.post<void>('/api/auth/logout', undefined, true),
  signup: (request: SignupRequest) => apiClient.post<void>('/api/auth/signup', request, false),
}
