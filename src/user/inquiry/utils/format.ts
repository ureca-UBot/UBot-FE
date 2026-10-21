export const dateTime = (value: string) => new Date(value).toLocaleString('ko-KR')

export const errorText = (error: unknown) =>
  error instanceof Error ? error.message : '요청을 처리하지 못했습니다.'
