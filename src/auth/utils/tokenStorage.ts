import type { LoginResponse } from '../types/auth'

const accessTokenKey = 'accessToken'
const refreshTokenKey = 'refreshToken'

export const tokenStorage = {
  getAccessToken: () => sessionStorage.getItem(accessTokenKey),
  getRefreshToken: () => sessionStorage.getItem(refreshTokenKey),
  setTokens: ({ accessToken, refreshToken }: LoginResponse) => {
    sessionStorage.setItem(accessTokenKey, accessToken)
    sessionStorage.setItem(refreshTokenKey, refreshToken)
  },
  clear: () => {
    sessionStorage.removeItem(accessTokenKey)
    sessionStorage.removeItem(refreshTokenKey)
  },
}
