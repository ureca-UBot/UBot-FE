export const counselConfig = {
  enabled:
    import.meta.env.VITE_COUNSEL_ENABLED !== 'false' &&
    (!!import.meta.env.VITE_API_BASE_URL?.trim() ||
      !window.location.hostname.endsWith('.github.io')),
  requestTimeoutMs: 15000,
  pollIntervalMs: 2000,
  heartbeatIntervalMs: 15000,
}
