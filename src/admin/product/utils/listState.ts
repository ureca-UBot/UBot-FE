export const PAGE_SIZE = 20

export function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}
