const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
let modules
const storage = new Map()
const originalFetch = global.fetch
const originalStorage = global.sessionStorage

before(async () => {
  const { build } = await import('vite')
  await build({
    root,
    configFile: false,
    envDir: false,
    logLevel: 'silent',
    define: {
      'import.meta.env.BASE_URL': '"/"',
      'import.meta.env.VITE_API_BASE_URL': '""',
    },
    build: {
      lib: {
        entry: 'scripts/test-support/logic.ts',
        formats: ['cjs'],
        fileName: () => 'logic.cjs',
      },
      outDir: 'test-results/unit',
      emptyOutDir: false,
      minify: false,
    },
  })
  modules = require('../test-results/unit/logic.cjs')
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

test('현재 사용자 경로와 이전 경로 별칭을 올바른 화면으로 연결한다', () => {
  const { routes } = modules
  for (const key of Object.keys(routes.userPageTitles)) {
    assert.equal(routes.userPageFromPath(routes.userPagePath(key)), key)
  }
  assert.deepEqual(['/benefit', '/network', '/stores/', '/unknown'].map(routes.userPageFromPath), [
    'store',
    'notices',
    'stores',
    'ai',
  ])
})

test('채팅 진행 상태는 대상 요청만 불변으로 갱신한다', () => {
  const pending = { id: 1, isPending: true, researches: [] }
  const complete = { id: 2, isPending: false, researches: [] }
  const progress = { status: 'RUNNING', phase: null, remainingMs: 1000 }
  const updated = modules.chat.updateProgress([pending, complete], 1, progress)
  assert.equal(updated[0].progress, progress)
  assert.equal(updated[1], complete)
  assert.equal(pending.progress, undefined)
  assert.equal(modules.chat.updateProgress([complete], 2, progress)[0], complete)
})

test('재검색은 같은 의도의 결과만 교체하고 네트워크 실패만 다시 허용한다', () => {
  const old = { intent: 'GENERAL', isPending: false, response: null, errorCode: null }
  const turn = { id: 1, researches: [old] }
  const next = { ...old, isPending: true }
  assert.deepEqual(modules.chat.upsertResearch([turn], 1, next)[0].researches, [next])
  assert.equal(turn.researches[0], old)
  assert.equal(modules.chat.canResearchAgain(old), true)
  assert.equal(modules.chat.canResearchAgain(next), false)
  assert.equal(modules.chat.canResearchAgain({ ...old, errorCode: 'FE-CHAT-001' }), false)
  assert.deepEqual(
    [
      [null, '1'],
      ['1', '2'],
      ['1', null],
    ].map(([a, b]) => modules.chat.keepsConversation(a, b)),
    [true, false, false],
  )
})

test('채팅 응답의 성공·업무 실패·인증 실패·잘못된 응답을 구분한다', async () => {
  const response = {
    answer: '답변',
    status: 'SUCCESS',
    idempotencyKey: null,
    attemptCount: 1,
    retryable: false,
  }
  const failed = { ...response, status: 'FAIL', answer: '처리 실패' }
  assert.deepEqual(
    [null, {}, response, { ...response, attemptCount: -1 }].map(modules.chat.isChatResponse),
    [false, false, true, false],
  )
  assert.equal((await modules.chat.settleRequest(async () => response)).error, null)
  assert.equal((await modules.chat.settleRequest(async () => failed)).error, '처리 실패')
  const denied = await modules.chat.settleRequest(async () => {
    throw new modules.api.ApiRequestError('거절', 401, 'JWT-004', [])
  })
  assert.equal(denied.errorCode, 'JWT-004')
  assert.equal(denied.response, null)
  assert.equal((await modules.chat.settleRequest(async () => ({}))).response, null)
})

test('상품 표시 단위와 폼 검증 경계값을 유지한다', () => {
  const { product, productForm } = modules
  assert.deepEqual([0, 1023, 1024, 1536].map(product.formatDataAmount), [
    '0MB',
    '1,023MB',
    '1GB',
    '1.5GB',
  ])
  assert.equal(product.formatWon(33000), '33,000원')
  assert.equal(product.formatPlanData({ dataUnlimited: true, dataAmountMb: null }), '무제한')
  assert.equal(product.formatPlanData({ dataUnlimited: false, dataAmountMb: null }), '-')
  assert.equal(productForm.validateCommonValues({ code: 'PLAN_01', name: '요금제' }, true), null)
  assert.notEqual(
    productForm.validateCommonValues({ code: 'bad-code', name: '요금제' }, true),
    null,
  )
  assert.notEqual(productForm.validateCommonValues({ code: 'PLAN_01', name: '  ' }, true), null)
  assert.equal(productForm.descriptionOrNull('  '), null)
  assert.equal(productForm.toNullableNumber('0'), 0)
  assert.equal(productForm.toNullableNumber(''), null)
})

test('지도 왕복 경로의 우측 오프셋과 출발·도착 항목을 유지한다', () => {
  const { geometry, routeItems } = modules
  const projection = { toScreen: (v) => v, fromScreen: (v) => v }
  const points = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 0, y: 0 },
  ]
  assert.deepEqual(geometry.offsetPathToRight(points, projection, 3), [
    { x: 0, y: 3 },
    { x: 10, y: 3 },
    { x: 10, y: -3 },
    { x: 0, y: -3 },
  ])
  assert.equal(geometry.offsetPathToRight(points, projection, 0), points)
  const places = { origin: '현재 위치', destination: '강남점' }
  assert.equal(routeItems.startItem(places, { x: 1, y: 2 }).text, '출발 · 현재 위치')
  assert.equal(routeItems.endItem(places, { x: 3, y: 4 }).text, '도착 · 강남점')
  assert.equal(routeItems.carGuideKind([{ guidance: '출발' }, { guidance: '도착' }], 1), 'end')
})

const response = (data, status = 200, code = 'SUCCESS') =>
  new Response(JSON.stringify({ success: status === 200, data, code, message: code }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

test('동시 JWT-007 응답은 토큰을 한 번만 재발급한다', async () => {
  modules.tokenStorage.setTokens({ accessToken: 'old', refreshToken: 'refresh' })
  let refreshes = 0,
    calls = 0
  global.fetch = async (url, init) => {
    if (url === '/api/auth/refresh') {
      refreshes++
      await new Promise((resolve) => setTimeout(resolve, 10))
      assert.deepEqual(JSON.parse(init.body), { refreshToken: 'refresh' })
      return response({ accessToken: 'new', refreshToken: 'rotated' })
    }
    calls++
    return init.headers.Authorization === 'Bearer new'
      ? response('ok')
      : response(null, 401, 'JWT-007')
  }
  assert.deepEqual(
    await Promise.all([modules.api.apiClient.get('/one'), modules.api.apiClient.get('/two')]),
    ['ok', 'ok'],
  )
  assert.equal(refreshes, 1)
  assert.equal(calls, 4)
  assert.equal(storage.get('refreshToken'), 'rotated')
})

test('재발급 서버 오류에는 세션을 보존하고 토큰 거절에는 만료를 알린다', async () => {
  modules.tokenStorage.setTokens({ accessToken: 'old', refreshToken: 'refresh' })
  let expired = 0
  const stop = modules.api.onSessionExpired(() => expired++)
  try {
    global.fetch = async (url) =>
      url === '/api/auth/refresh' ? response(null, 500, 'SERVER') : response(null, 401, 'JWT-007')
    await assert.rejects(modules.api.apiClient.get('/one'))
    assert.equal(storage.get('accessToken'), 'old')
    assert.equal(expired, 0)
    global.fetch = async () => response(null, 401, 'JWT-004')
    await assert.rejects(modules.api.apiClient.get('/one'))
    assert.equal(storage.size, 0)
    assert.equal(expired, 1)
  } finally {
    stop()
  }
})

test('완료된 채팅은 답변을 반환하고 추가 조회하지 않는다', async () => {
  let polls = 0
  global.fetch = async () => {
    polls++
    return response({ status: 'SUCCEEDED', answer: '답변', idempotencyKey: 'key', attemptCount: 1 })
  }
  const result = await modules.polling.waitForAnswer({
    jobId: '1',
    status: 'QUEUED',
    conversationId: 'conversation',
  })
  assert.equal(result.answer, '답변')
  assert.equal(result.conversationId, 'conversation')
  assert.equal(polls, 1)
})

test('종료된 채팅의 AbortSignal은 다음 폴링 요청을 취소한다', async () => {
  let polls = 0
  global.fetch = async () => {
    polls++
    return response({ status: 'RUNNING' })
  }
  const controller = new AbortController()
  const pending = modules.polling.waitForAnswer(
    { jobId: '1', status: 'QUEUED' },
    { signal: controller.signal },
  )
  controller.abort(new Error('closed'))
  await assert.rejects(pending, /closed/)
  assert.equal(polls, 0)
})

test('스타일 진입점은 중복 없이 존재하는 분할 파일만 불러온다', () => {
  for (const relative of ['src/App.css', 'src/user/styles/user.css']) {
    const full = path.join(root, relative)
    const imports = [...fs.readFileSync(full, 'utf8').matchAll(/@import\s+['"](.+?)['"];/g)].map(
      ([, imported]) => imported,
    )

    assert.ok(imports.length > 0)
    assert.equal(new Set(imports).size, imports.length)

    for (const imported of imports) {
      const importedFile = path.resolve(path.dirname(full), imported)
      assert.equal(fs.existsSync(importedFile), true)
      assert.notEqual(fs.readFileSync(importedFile, 'utf8').trim(), '')
    }
  }
})
