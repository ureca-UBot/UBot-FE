// BE GuestChatSettingsResponseDto
export interface GuestChatSettingsResponse {
  maxQuestionCount: number
  updatedBy: number | null
  updatedAt: string
}

// BE GuestChatSettingsUpdateRequestDto: 1 이상이어야 합니다.
export interface GuestChatSettingsUpdateRequest {
  maxQuestionCount: number
}
