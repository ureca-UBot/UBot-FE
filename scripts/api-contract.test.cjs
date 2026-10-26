const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')

let api
const originalFetch = global.fetch
const originalStorage = global.sessionStorage
const storage = new Map()

before(async () => {
  const { build } = await import('vite')
  await build({
    root: path.resolve(__dirname, '..'),
    configFile: false,
    envDir: false,
    logLevel: 'silent',
    define: { 'import.meta.env.VITE_API_BASE_URL': '"https://api.example.test/"' },
    build: {
      lib: { entry: 'scripts/test-support/api.ts', formats: ['cjs'], fileName: () => 'api.cjs' },
      outDir: 'test-results/api-contract',
      emptyOutDir: false,
    },
  })
  api = require('../test-results/api-contract/api.cjs')
  global.sessionStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  }
})

after(() => {
  global.fetch = originalFetch
  if (originalStorage === undefined) delete global.sessionStorage
  else global.sessionStorage = originalStorage
})

function captureRequests() {
  const calls = []
  global.fetch = async (url, init = {}) => {
    calls.push({ url, init })
    return new Response(JSON.stringify({ success: true, data: [] }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return calls
}

test('별도 API 서버에서도 매장·길찾기 요청에 /api 접두사를 유지한다', async () => {
  const calls = captureRequests()
  await api.storeRequest('/stores?size=20')
  await api.storeRequest('/stores/1/directions?mode=WALK')
  assert.deepEqual(
    calls.map(({ url }) => url),
    [
      'https://api.example.test/api/stores?size=20',
      'https://api.example.test/api/stores/1/directions?mode=WALK',
    ],
  )
})

test('공개 상품 목록·상세는 저장된 토큰이 만료돼도 인증 헤더 없이 조회한다', async () => {
  api.tokenStorage.setTokens({ accessToken: 'expired', refreshToken: 'expired' })
  const calls = captureRequests()
  await api.productApi.getPlanList()
  await api.productApi.getPlan(1)
  await api.productApi.getBundleProductList()
  await api.productApi.getBundleProduct(1)
  await api.productApi.getAddonServiceList()
  await api.productApi.getAddonService(1)
  await api.productApi.getRoamingProductList()
  await api.productApi.getRoamingProduct(1)
  assert.equal(calls.length, 8)
  assert.ok(calls.every(({ init }) => !new Headers(init.headers).has('Authorization')))
  api.tokenStorage.clear()
})

test('다른 origin의 채팅 접수와 상태 조회에도 게스트 세션 쿠키를 전달한다', async () => {
  const calls = captureRequests()
  await api.apiClient.post('/api/chat/questions', { question: '질문' })
  await api.apiClient.get('/api/chat/jobs/1')
  assert.ok(calls.every(({ init }) => init.credentials === 'include'))
})

test('번호 중복 검사는 인증과 취소 신호를 유지하고 조회 전용 API로 요청한다', async () => {
  api.tokenStorage.setTokens({ accessToken: 'phone-check', refreshToken: 'refresh' })
  const calls = captureRequests()
  const controller = new AbortController()
  await api.subscriptionApi.checkPhoneNumber('010-1234-5678', controller.signal)
  assert.equal(
    calls[0].url,
    'https://api.example.test/api/subscriptions/me/phone-number-availability?phoneNumber=010-1234-5678',
  )
  assert.equal(calls[0].init.method ?? 'GET', 'GET')
  assert.equal(new Headers(calls[0].init.headers).get('Authorization'), 'Bearer phone-check')
  assert.equal(calls[0].init.signal, controller.signal)
  api.tokenStorage.clear()
})
