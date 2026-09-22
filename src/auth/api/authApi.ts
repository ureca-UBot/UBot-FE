import { apiClient } from '../../shared/api/client'
import type { LoginRequest, LoginResponse, RefreshTokenRequest, SignupRequest } from '../types/auth'

export const authApi = {
  login: (request: LoginRequest) => apiClient.post<LoginResponse>('/auth/login', request, false),
  refresh: (request: RefreshTokenRequest) => apiClient.post<LoginResponse>('/auth/refresh', request, false),
  logout: () => apiClient.post<void>('/auth/logout', undefined, true),
  signup: (request: SignupRequest) => apiClient.post<void>('/auth/signup', request, false),
}
