import { apiClient } from '../../../shared/api/client'
import type { UserProfile, UserProfileUpdateRequest } from '../types/profile'

export const profileApi = {
  getMe: () => apiClient.get<UserProfile>('/api/auth/me'),
  updateMe: (request: UserProfileUpdateRequest) => apiClient.patch<UserProfile>('/api/auth/me', request),
}
