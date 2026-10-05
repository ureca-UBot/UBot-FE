import { apiClient } from '../../../shared/api/client'
import type { GuestChatSettingsResponse, GuestChatSettingsUpdateRequest } from '../types/guestChatSettings'

const BASE_PATH = '/api/admin/guest-chat-settings'

export const adminGuestChatSettingsApi = {
  getGuestChatSettings: () => apiClient.get<GuestChatSettingsResponse>(BASE_PATH),
  updateGuestChatSettings: (body: GuestChatSettingsUpdateRequest) =>
    apiClient.patch<GuestChatSettingsResponse>(BASE_PATH, body),
}
