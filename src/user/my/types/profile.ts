export type Gender = 'MALE' | 'FEMALE'

// BE UserResponseDto
export interface UserProfile {
  id: number
  email: string
  name: string
  birthDate: string | null
  gender: Gender | null
  residenceArea: string | null
  role: 'USER' | 'ADMIN'
  createdAt: string
}

// BE UserUpdateRequestDto: 보낸 항목만 수정합니다.
export interface UserProfileUpdateRequest {
  name?: string
  birthDate?: string
  gender?: Gender
  residenceArea?: string
}
