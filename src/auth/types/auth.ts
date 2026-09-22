export interface LoginRequest {
  email: string
  password: string
}

export interface RefreshTokenRequest {
  refreshToken: string
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
}

export interface SignupRequest {
  email: string
  password: string
  passwordConfirm: string
  name: string
  birthDate: string
  gender: 'MALE' | 'FEMALE'
  residenceArea: string
}

export interface AuthUser {
  id: string
  role: 'USER' | 'ADMIN'
}
