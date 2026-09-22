const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')

export interface ApiResponse<T> {
  success: boolean
  code: string
  message: string
  data: T
}

interface ApiErrorOptions {
  status?: number
  code?: string
  data?: unknown
}

export class ApiError extends Error {
  readonly status?: number
  readonly code?: string
  readonly data?: unknown

  constructor(message: string, { status, code, data }: ApiErrorOptions = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.data = data
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

async function parseResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) return response.json().catch(() => null)
  return response.text().catch(() => '')
}

export async function storeRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const response = await fetch(`${API_BASE_URL}${normalizedPath}`, options)

  if (!response.ok) {
    const body = await parseResponse(response)
    const message = isRecord(body) && typeof body.message === 'string'
      ? body.message
      : (typeof body === 'string' && body) || `API 요청에 실패했습니다. (${response.status})`
    throw new ApiError(message, {
      status: response.status,
      code: isRecord(body) && typeof body.code === 'string' ? body.code : undefined,
      data: isRecord(body) ? body.data : undefined,
    })
  }

  return await parseResponse(response) as T
}
