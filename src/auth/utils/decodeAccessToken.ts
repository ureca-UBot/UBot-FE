import type { AuthUser } from '../types/auth'

interface JwtPayload {
  sub?: string
  role?: string
  exp?: number
}

function getPayload(accessToken: string): JwtPayload | null {
  const payload = accessToken.split('.')[1]
  if (!payload) return null

  try {
    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/')
    const paddedPayload = normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, '=')
    return JSON.parse(atob(paddedPayload)) as JwtPayload
  } catch {
    return null
  }
}

export function getAuthUser(accessToken: string): AuthUser | null {
  const payload = getPayload(accessToken)
  if (!payload?.sub || (payload.role !== 'USER' && payload.role !== 'ADMIN')) return null
  return { id: payload.sub, role: payload.role }
}

export function isAccessTokenExpired(accessToken: string) {
  const expiration = getPayload(accessToken)?.exp
  return !expiration || expiration * 1000 <= Date.now()
}
