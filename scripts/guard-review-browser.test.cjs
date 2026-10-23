const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const net = require('node:net')
const { startServer, launchBrowser } = require('./test-support/browser.cjs')
const { installFixtures } = require('./test-support/fixtures.cjs')
const root = path.resolve(__dirname, '..')
let server, browser
before(async () => {
  const probe = net.createServer()
  await new Promise((resolve) => probe.listen(0, '127.0.0.1', resolve))
  const port = probe.address().port
  await new Promise((resolve) => probe.close(resolve))
  server = await startServer(root, port)
  browser = await launchBrowser()
})
after(async () => {
  await browser?.close()
  server?.close()
})

async function pageFixture(mobile = false, options = {}) {
  const context = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1366, height: 960 },
  })
  await installFixtures(context, 'ADMIN')
  const requests = []
  const state = {
    settings: {
      enabled: false,
      intervalMinutes: 1440,
      groupingThreshold: 1,
      revision: 1,
      nextRunAt: null,
    },
    runs: [],
    retention: { detailDays: 30, summaryDays: 90, historyDays: 365 },
    history: [],
    words: [
      {
        id: 1,
        kind: 'WORD',
        category: 'ABUSE',
        expression: '검토 표현',
        reason: '추천 이유',
        revision: 1,
        status: 'PENDING',
        occurrences: 2,
      },
    ],
    warnings: [
      {
        id: 2,
        kind: 'WARNING',
        category: 'FRAUD',
        expression: '<script>실행되지 않는 검토 자료</script>',
        reason: '위험 요구 의심',
        revision: 1,
        status: 'PENDING',
        occurrences: 12,
        unreadOccurrences: 3,
      },
    ],
  }
  if (options.manyWords) {
    const original = state.words[0]
    state.words = [
      ...Array.from({ length: 200 }, (_, i) => ({
        ...original,
        id: 201 - i,
        expression: `샘플 후보 ${201 - i}`,
      })),
      original,
    ]
  }
  const cases = Array.from({ length: options.caseCount ?? 1 }, (_, index) => ({
    id: `case-${index + 1}`,
    category: 'NORMAL',
    stage: 'INPUT',
    before: options.unsafeCase
      ? '<script>window.caseScriptRan=true</script>'
      : `정상 질문 ${index + 1}`,
    after: `정상 질문 ${index + 1}`,
    falsePositive: false,
    regression: false,
    baselineFailure: false,
    newDetection: false,
  }))
  // 전체 집계의 문제 사례는 첫 페이지 바깥에 둡니다.
  if (cases.length > 0) {
    if (options.summary?.falsePositives === 1) cases.at(-1).falsePositive = true
    if (options.summary?.regressions === 1) cases.at(-1).regression = true
  }
  const alerts = [{ id: 8, candidateId: 2, message: 'FRAUD · 신규 3건 · 누적 12건', read: false }]
  await context.route('**/api/admin/guard-review**', async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      p = url.pathname,
      method = req.method()
    const body = method === 'GET' ? null : req.postDataJSON()
    requests.push({ p, query: url.search, method, body, headers: req.headers() })
    const ok = (data) => route.fulfill({ json: { success: true, code: 'SUCCESS', data } })
    if (options.apiUnavailable)
      return route.fulfill({ status: 404, json: { success: false, message: 'Not Found' } })
    if (p.endsWith('/candidates') && method === 'GET') {
      const items = url.searchParams.get('kind') === 'WORD' ? state.words : state.warnings
      const page = Number(url.searchParams.get('page') ?? 0),
        size = Number(url.searchParams.get('size') ?? 20)
      return ok({
        content: items.slice(page * size, (page + 1) * size),
        page,
        size,
        totalElements: items.length,
        totalPages: Math.ceil(items.length / size),
        first: page === 0,
        last: (page + 1) * size >= items.length,
      })
    }
    if (p.endsWith('/notifications/8/read')) {
      alerts[0].read = true
      return ok(null)
    }
    if (p.endsWith('/notifications')) return ok(alerts)
    if (p.endsWith('/settings')) {
      if (options.failSettings)
        return route.fulfill({
          status: 409,
          json: {
            success: false,
            code: 'GUARD-REVIEW-002',
            message: '설정이 변경됐습니다. 다시 확인해 주세요.',
          },
        })
      Object.assign(state.settings, body, { revision: state.settings.revision + 1 })
      return ok(state.settings)
    }
    if (p.endsWith('/analysis')) {
      state.runs.unshift({
        id: 10,
        kind: 'ANALYSIS',
        analysisMode: 'FULL',
        detailsRetained: true,
        status: 'QUEUED',
        processed: 0,
        total: 120,
        result: {},
        createdAt: '2026-10-22',
      })
      return ok(10)
    }
    if (p.endsWith('/validation')) {
      if (!options.omitValidationFromOverview)
        state.runs.unshift({
          id: 11,
          kind: 'VALIDATION',
          status: 'COMPLETED',
          processed: cases.length,
          total: cases.length,
          result: {},
          createdAt: '2026-10-22',
        })
      return ok(11)
    }
    if (p.endsWith('/runs/11/cases')) {
      if (options.expiredCasePage || state.validationExpired)
        return route.fulfill({
          status: 409,
          json: { success: false, code: 'GUARD-REVIEW-004', message: '다시 검사해 주세요.' },
        })
      if (options.casePageUnavailable && !state.casePageRecovered) {
        return route.fulfill({
          status: 503,
          json: { success: false, message: '검사 사례 조회 일시 실패' },
        })
      }
      const page = Number(url.searchParams.get('page') ?? 0)
      const size = Number(url.searchParams.get('size') ?? 20)
      return ok({
        content: cases.slice(page * size, (page + 1) * size),
        page,
        size,
        totalElements: cases.length,
        totalPages: Math.ceil(cases.length / size),
        first: page === 0,
        last: (page + 1) * size >= cases.length,
      })
    }
    if (p.endsWith('/runs/11'))
      return ok({
        id: 11,
        kind: 'VALIDATION',
        status: 'COMPLETED',
        processed: cases.length,
        total: cases.length,
        ...state.runs.find((r) => r.id === 11),
        detailsRetained: !options.expiredValidation && !state.validationExpired,
        result: {
          baseVersion: 'base',
          datasetVersion: 'gold',
          caseCount: cases.length,
          falsePositives: 0,
          regressions: 0,
          baselineFailures: 0,
          newDetections: 0,
          ...options.summary,
        },
      })
    const editMatch = p.match(/\/candidates\/(\d+)$/)
    if (editMatch && method === 'PATCH') {
      const word = state.words.find((c) => c.id === Number(editMatch[1]))
      Object.assign(word, body, { revision: word.revision + 1, status: 'PENDING' })
      return ok(word)
    }
    if (p.endsWith('/approval')) {
      state.words[0].status = 'APPLIED'
      return ok(null)
    }
    if (p.endsWith('/findings'))
      return ok([
        {
          id: 1,
          sourceKey: 'original-1',
          stage: 'INPUT',
          question: '신고 방법을 알려주세요',
          answer: '신고 안내',
          detailsRetained: !options.expiredFindings,
        },
      ])
    if (p.endsWith('/decision')) {
      state.warnings[0].status = 'REVIEWED'
      return ok(null)
    }
    return ok(state)
  })
  const page = await context.newPage()
  const failures = []
  page.on('pageerror', (error) => failures.push(error.message))
  page.on('request', (req) => {
    const host = new URL(req.url()).hostname
    if (!['127.0.0.1', 'localhost', ''].includes(host))
      failures.push(`Unexpected external request: ${host}`)
  })
  await page.goto(`${server.origin}/#/admin/forbidden-words/review`)
  await page.getByRole('heading', { name: 'AI 금칙어·위험 문장 검토' }).waitFor()
  return { context, page, state, requests, failures }
}

test('검토 API 준비 전에는 안내하고 기존 금지어 관리로 돌아갈 수 있다', async () => {
  const { context, page, requests, failures } = await pageFixture(false, { apiUnavailable: true })
  try {
    await page
      .getByRole('alert')
      .filter({ hasText: 'AI 검토 기능이 아직 서버에 준비되지 않았습니다.' })
      .waitFor()
    assert.equal(await page.getByText('검토 목록을 불러오는 중입니다.', { exact: true }).count(), 0)
    assert.equal(
      requests.every((request) => request.method === 'GET'),
      true,
    )
    await page.getByRole('link', { name: '등록된 금지어', exact: true }).click()
    await page.getByRole('heading', { name: '금지어 관리', exact: true }).waitFor()
    await page.getByLabel('새 금지어').waitFor()
    assert.deepEqual(failures, [])
  } finally {
    await context.close()
  }
})

test('주기 설정과 분석 접수·진행 상태를 표시한다', async () => {
  const { context, page, requests, failures } = await pageFixture()
  try {
    await page.getByRole('link', { name: '분석 설정', exact: true }).click()
    await page.getByLabel('주기 분석 사용').check()
    await page.getByRole('button', { name: '1시간마다', exact: true }).click()
    await page.getByRole('button', { name: '설정 저장' }).click()
    await page.getByRole('button', { name: '전체 재분석' }).click()
    await page.getByText('0 / 120').waitFor()
    await page.getByText('대화 분석 · 전체 재분석', { exact: true }).waitFor()
    await page.getByText('분석 범위·기록 보관 안내', { exact: true }).click()
    await page.getByText(/주기 분석은 이전에 성공적으로/).waitFor()
    await page.getByText(/상세 자료 30일/).waitFor()
    assert.equal(requests.find((r) => r.p.endsWith('/settings')).body.intervalMinutes, 60)
    assert.equal(await page.getByRole('button', { name: '전체 재분석' }).isDisabled(), true)
    assert.deepEqual(failures, [])
  } finally {
    await context.close()
  }
})

test('성공한 검사도 상세 보관이 만료되면 승인과 캐시된 결과를 사용하지 않는다', async () => {
  const { context, page, state, requests, failures } = await pageFixture()
  try {
    await page.getByRole('link', { name: '금칙어 후보', exact: true }).click()
    await page.getByLabel('검토 표현 선택').check()
    await page.getByRole('button', { name: '선택 후보 오차단 테스트' }).click()
    await page.waitForFunction(() =>
      [...document.querySelectorAll('button')].some(
        (b) => b.textContent === '검사한 후보 승인 적용' && !b.disabled,
      ),
    )
    state.validationExpired = true
    await page.getByText('검사 상세의 보관기간이 만료됐습니다. 다시 검사해 주세요.').waitFor()
    assert.equal(
      await page.getByRole('button', { name: '검사한 후보 승인 적용' }).isDisabled(),
      true,
    )
    assert.equal(
      requests.some((r) => r.p.endsWith('/approval')),
      false,
    )
    assert.deepEqual(failures, [])
  } finally {
    await context.close()
  }
})

test('주기 분석 범위를 표시하고 만료된 실패 실행의 재개는 제공하지 않는다', async () => {
  const { context, page, state, failures } = await pageFixture()
  try {
    await page.getByRole('link', { name: '분석 설정', exact: true }).click()
    state.runs.push({
      id: 25,
      kind: 'ANALYSIS',
      analysisMode: 'INCREMENTAL',
      status: 'FAILED',
      detailsRetained: false,
      processed: 2,
      total: 3,
      result: {},
    })
    await page.getByText('대화 분석 · 신규·변경분', { exact: true }).waitFor()
    await page.getByText('상세 보관 만료 · 재검사 필요').waitFor()
    assert.equal(await page.getByRole('button', { name: '실패 건 재개' }).count(), 0)
    assert.deepEqual(failures, [])
  } finally {
    await context.close()
  }
})

test('분석 실행의 재시도 대기와 중단 사유·건수를 실행 이력에 표시한다', async () => {
  const { context, page, state, failures } = await pageFixture()
  try {
    await page.getByRole('link', { name: '분석 설정', exact: true }).click()
    state.runs.push(
      {
        id: 31,
        kind: 'ANALYSIS',
        analysisMode: 'FULL',
        status: 'RUNNING',
        detailsRetained: true,
        processed: 4,
        total: 10,
        result: {
          consecutiveFailures: 2,
          retryAt: '2026-10-23T09:00:30',
          errorCode: 'LLM_TIMEOUT',
          completed: 4,
          failed: 0,
          pending: 6,
        },
      },
      {
        id: 32,
        kind: 'ANALYSIS',
        analysisMode: 'INCREMENTAL',
        status: 'FAILED',
        detailsRetained: true,
        processed: 5,
        total: 10,
        result: {
          error: 'REVIEW_FAILED',
          errorCode: 'LLM_SERVICE_UNAVAILABLE',
          completed: 4,
          failed: 1,
          pending: 5,
        },
      },
    )
    await page.getByText('자동 재시도 대기', { exact: false }).waitFor()
    await page.getByText('모델 응답 시간 초과 (2/3회 실패)', { exact: false }).waitFor()
    await page.getByText('최종 실패 · 분석 중단', { exact: false }).waitFor()
    await page.getByRole('columnheader', { name: '처리(실패 포함) / 전체' }).waitFor()
    await page.getByText('이후 재시도', { exact: false }).waitFor()
    await page.getByText('모델 서버에 연결하지 못함', { exact: false }).waitFor()
    await page.getByText('완료 4건 · 실패 1건 · 남음 5건', { exact: false }).waitFor()
    assert.equal(await page.getByRole('button', { name: '실패 건 재개' }).count(), 1)
    assert.deepEqual(failures, [])
  } finally {
    await context.close()
  }
})

test('상세 보관이 만료된 실패 실행에는 재개 안내를 표시하지 않는다', async () => {
  const { context, page, state, failures } = await pageFixture()
  try {
    await page.getByRole('link', { name: '분석 설정', exact: true }).click()
    state.runs.push({
      id: 33,
      kind: 'ANALYSIS',
      analysisMode: 'FULL',
      status: 'FAILED',
      detailsRetained: false,
      processed: 2,
      total: 3,
      result: { error: 'REVIEW_FAILED', completed: 2, failed: 1, pending: 0 },
    })
    await page.getByText('상세 보관 만료 · 재검사 필요').waitFor()
    await page.getByText('최종 실패 · 분석 중단', { exact: false }).waitFor()
    assert.equal(await page.getByText('재개하면', { exact: false }).count(), 0)
    assert.deepEqual(failures, [])
  } finally {
    await context.close()
  }
})

test('보관기간이 지난 발견 사례를 현재 원문인 것처럼 보여주지 않는다', async () => {
  const { context, page, failures } = await pageFixture(false, { expiredFindings: true })
  try {
    await page.getByRole('link', { name: '위험 문장 경고', exact: true }).click()
    await page.getByRole('button', { name: '전체 사례 보기', exact: true }).click()
    await page.locator('aside[aria-label="발견 사례"]').waitFor()
    assert.equal(
      await page.getByText('상세 자료 보관기간이 만료됐습니다.', { exact: true }).count(),
      2,
    )
    assert.equal(await page.getByText('신고 방법을 알려주세요', { exact: true }).count(), 0)
    assert.deepEqual(failures, [])
  } finally {
    await context.close()
  }
})
test('후보 수정 후 이전 검사를 폐기하고 재검사한 버전만 승인한다', async () => {
  const { context, page, requests, failures } = await pageFixture()
  try {
    await page.getByRole('link', { name: '금칙어 후보', exact: true }).click()
    await page.getByLabel('검토 표현 선택').check()
    assert.equal(
      await page.getByRole('button', { name: '검사한 후보 승인 적용' }).isDisabled(),
      true,
    )
    await page.getByRole('button', { name: '선택 후보 오차단 테스트' }).click()
    await page.getByRole('button', { name: '검사한 후보 승인 적용' }).waitFor({ state: 'visible' })
    await page.waitForFunction(() =>
      [...document.querySelectorAll('button')].some(
        (b) => b.textContent === '검사한 후보 승인 적용' && !b.disabled,
      ),
    )
    await page.getByRole('button', { name: '후보 수정', exact: true }).click()
    await page.getByLabel('후보 표현').fill('수정 표현')
    await page.getByRole('button', { name: '후보 저장' }).click()
    await page.getByLabel('수정 표현 선택').waitFor()
    assert.equal(
      await page.getByRole('button', { name: '검사한 후보 승인 적용' }).isDisabled(),
      true,
    )
    await page.getByRole('button', { name: '선택 후보 오차단 테스트' }).click()
    await page.waitForFunction(() =>
      [...document.querySelectorAll('button')].some(
        (b) => b.textContent === '검사한 후보 승인 적용' && !b.disabled,
      ),
    )
    await page.getByRole('button', { name: '검사한 후보 승인 적용' }).click()
    const approval = requests.find((r) => r.p.endsWith('/approval'))
    assert.equal(approval.body.selection[0].revision, 2)
    assert.deepEqual(failures, [])
  } finally {
    await context.close()
  }
})
test('위험 문장은 경고·사례·읽음 처리만 제공하고 HTML을 실행하지 않는다', async () => {
  const { context, page, requests, failures } = await pageFixture(true)
  try {
    await page.getByRole('link', { name: '위험 문장 경고', exact: true }).click()
    await page.getByText('FRAUD · 신규 3건 · 누적 12건').waitFor()
    assert.equal(await page.locator('article script').count(), 0)
    assert.equal(await page.getByRole('button', { name: '검사한 후보 승인 적용' }).count(), 0)
    await page.getByRole('button', { name: '전체 사례 보기' }).click()
    await page.getByText('원본 original-1 · INPUT').waitFor()
    await page.getByRole('button', { name: '알림 읽음 처리' }).click()
    await page.getByRole('button', { name: '읽음', exact: true }).waitFor()
    assert.equal(
      requests.some((r) => r.p.endsWith('/approval')),
      false,
    )
    fs.mkdirSync(path.join(root, 'test-results'), { recursive: true })
    await page.screenshot({
      path: path.join(root, 'test-results/guard-review-warning-mobile.png'),
      fullPage: true,
    })
    assert.deepEqual(failures, [])
  } finally {
    await context.close()
  }
})

test('200건을 넘는 오래된 후보도 기존 페이지 이동으로 찾고 선택을 새로 시작한다', async () => {
  const { context, page, requests, failures } = await pageFixture(false, { manyWords: true })
  try {
    await page.getByRole('link', { name: '금칙어 후보', exact: true }).click()
    await page.getByLabel('샘플 후보 201 선택').check()
    await page.locator('.pagination').getByRole('button', { name: '다음', exact: true }).click()
    await page.getByLabel('검토 표현 선택').waitFor()
    assert.equal(
      await page.getByRole('button', { name: '선택 후보 오차단 테스트' }).isDisabled(),
      true,
    )
    assert.equal(
      requests.some((r) => r.query?.includes('kind=WORD&page=10&size=20')),
      true,
    )
    await page.getByLabel('검토 표현 선택').check()
    await page.getByRole('button', { name: '후보 수정', exact: true }).click()
    await page.getByLabel('후보 표현').fill('오래된 후보 수정')
    await page.getByRole('button', { name: '후보 저장' }).click()
    await page.getByLabel('오래된 후보 수정 선택').waitFor()
    assert.deepEqual(failures, [])
  } finally {
    await context.close()
  }
})

test('기존 목록 등록·연결 변경 상태는 승인을 막고 후보 수정을 허용한다', async () => {
  const { context, page, state, failures } = await pageFixture()
  try {
    state.words[0].status = 'REGISTERED'
    await page.getByRole('link', { name: '금칙어 후보', exact: true }).click()
    await page.getByText('기존 금칙어에 등록됨', { exact: true }).waitFor()
    assert.equal(await page.getByLabel('검토 표현 선택').isDisabled(), true)
    state.words[0].status = 'CATALOG_CHANGED'
    await page.getByText('연결된 금칙어 변경됨', { exact: true }).waitFor()
    await page.getByRole('button', { name: '후보 수정', exact: true }).click()
    await page.getByLabel('후보 표현').fill('복구한 후보')
    await page.getByRole('button', { name: '후보 저장' }).click()
    await page.getByLabel('복구한 후보 선택').waitFor()
    assert.equal(
      await page.getByRole('button', { name: '검사한 후보 승인 적용' }).isDisabled(),
      true,
    )
    assert.deepEqual(failures, [])
  } finally {
    await context.close()
  }
})

test('최근 실행 목록에 없는 검사도 실행 번호로 결과를 읽는다', async () => {
  const { context, page, failures } = await pageFixture(false, { omitValidationFromOverview: true })
  try {
    await page.getByRole('link', { name: '금칙어 후보', exact: true }).click()
    await page.getByLabel('검토 표현 선택').check()
    await page.getByRole('button', { name: '선택 후보 오차단 테스트' }).click()
    await page.waitForFunction(() =>
      [...document.querySelectorAll('button')].some(
        (b) => b.textContent === '검사한 후보 승인 적용' && !b.disabled,
      ),
    )
    await page.getByText('검사 실행 #11: 완료').waitFor()
    assert.deepEqual(failures, [])
  } finally {
    await context.close()
  }
})

test('금지어 목록에서 분석 설정으로 바로 가고 뒤로 가면 같은 화면으로 돌아온다', async () => {
  const { context, page, failures } = await pageFixture()
  try {
    await page.getByRole('link', { name: '등록된 금지어', exact: true }).click()
    await page.getByRole('heading', { name: '금지어 관리', exact: true }).waitFor()
    await page.getByRole('link', { name: 'AI 검토 설정', exact: true }).click()
    await page.getByRole('form', { name: 'AI 분석 설정', exact: true }).waitFor()
    assert.equal(new URL(page.url()).hash.endsWith('?view=settings'), true)
    await page.goBack()
    await page.getByRole('heading', { name: '금지어 관리', exact: true }).waitFor()
    await page.getByRole('link', { name: '위험 문장 경고', exact: true }).click()
    await page.getByRole('button', { name: '전체 사례 보기', exact: true }).waitFor()
    assert.deepEqual(failures, [])
  } finally {
    await context.close()
  }
})

test('기본 화면은 후보 검토이며 설정 주소는 새로고침해도 유지된다', async () => {
  const { context, page, failures } = await pageFixture()
  try {
    await page.getByLabel('검토 표현 선택').waitFor()
    assert.equal(await page.getByRole('form', { name: 'AI 분석 설정' }).count(), 0)
    await page.getByRole('link', { name: '분석 설정', exact: true }).click()
    await page.reload()
    await page.getByRole('form', { name: 'AI 분석 설정' }).waitFor()
    assert.deepEqual(failures, [])
  } finally {
    await context.close()
  }
})

test('매주 분석을 계산 없이 저장하고 저장 완료와 변경 없음 상태를 표시한다', async () => {
  const { context, page, state, requests, failures } = await pageFixture()
  try {
    await page.getByRole('link', { name: '분석 설정', exact: true }).click()
    assert.equal(
      await page.getByRole('button', { name: '설정 저장', exact: true }).isDisabled(),
      true,
    )
    await page.getByLabel('주기 분석 사용').check()
    await page.getByRole('button', { name: '매주', exact: true }).click()
    await page.getByRole('button', { name: '설정 저장', exact: true }).click()
    await page.getByText('분석 설정을 저장했습니다.', { exact: true }).waitFor()
    assert.equal(state.settings.intervalMinutes, 10080)
    assert.equal(requests.find((r) => r.p.endsWith('/settings')).body.intervalMinutes, 10080)
    assert.equal(
      await page.getByRole('button', { name: '설정 저장', exact: true }).isDisabled(),
      true,
    )
    assert.deepEqual(failures, [])
  } finally {
    await context.close()
  }
})

test('직접 설정은 시간·분 단위를 환산하고 범위를 벗어나면 저장을 막는다', async () => {
  const { context, page, requests, failures } = await pageFixture(true)
  try {
    await page.getByRole('link', { name: '분석 설정', exact: true }).click()
    await page.getByRole('button', { name: '직접 설정', exact: true }).click()
    await page.getByLabel('반복 간격', { exact: true }).fill('2')
    assert.equal(
      await page.getByRole('button', { name: '설정 저장', exact: true }).isDisabled(),
      true,
    )
    await page.getByLabel('반복 간격 단위', { exact: true }).selectOption('60')
    await page.getByRole('button', { name: '설정 저장', exact: true }).click()
    await page.getByText('분석 설정을 저장했습니다.', { exact: true }).waitFor()
    assert.equal(requests.find((r) => r.p.endsWith('/settings')).body.intervalMinutes, 120)
    await page.getByLabel('반복 간격', { exact: true }).fill('1000')
    await page.getByText('반복 간격을 5분~30일 범위의 정수로 입력해 주세요.').waitFor()
    assert.equal(
      await page.getByRole('button', { name: '설정 저장', exact: true }).isDisabled(),
      true,
    )
    assert.deepEqual(failures, [])
  } finally {
    await context.close()
  }
})

test('서버 설정이 바뀌어도 작성 중인 주기를 덮어쓰지 않고 최신 설정 확인을 요구한다', async () => {
  const { context, page, state, requests, failures } = await pageFixture()
  try {
    await page.getByRole('link', { name: '분석 설정', exact: true }).click()
    await page.getByRole('button', { name: '6시간마다', exact: true }).click()
    state.settings.intervalMinutes = 60
    state.settings.revision += 1
    await page
      .getByText('다른 관리자가 설정을 변경했습니다. 최신 설정을 불러온 뒤 다시 저장해 주세요.')
      .waitFor()
    assert.equal(
      await page
        .getByRole('button', { name: '6시간마다', exact: true })
        .getAttribute('aria-pressed'),
      'true',
    )
    assert.equal(
      await page.getByRole('button', { name: '설정 저장', exact: true }).isDisabled(),
      true,
    )
    assert.equal(
      requests.some((r) => r.p.endsWith('/settings')),
      false,
    )
    await page.getByRole('button', { name: '최신 설정 불러오기', exact: true }).click()
    assert.equal(
      await page
        .getByRole('button', { name: '1시간마다', exact: true })
        .getAttribute('aria-pressed'),
      'true',
    )
    assert.deepEqual(failures, [])
  } finally {
    await context.close()
  }
})

test('설정 저장 실패는 성공으로 표시하지 않고 변경 취소로 원래 값에 돌아온다', async () => {
  const { context, page, state, failures } = await pageFixture(false, { failSettings: true })
  try {
    await page.getByRole('link', { name: '분석 설정', exact: true }).click()
    await page.getByRole('button', { name: '1시간마다', exact: true }).click()
    await page.getByRole('button', { name: '설정 저장', exact: true }).click()
    await page.getByText('설정이 변경됐습니다. 다시 확인해 주세요.', { exact: true }).waitFor()
    assert.equal(await page.getByText('분석 설정을 저장했습니다.', { exact: true }).count(), 0)
    assert.equal(state.settings.intervalMinutes, 1440)
    await page.getByRole('button', { name: '변경 취소', exact: true }).click()
    assert.equal(
      await page.getByRole('button', { name: '매일', exact: true }).getAttribute('aria-pressed'),
      'true',
    )
    assert.deepEqual(failures, [])
  } finally {
    await context.close()
  }
})

test('검사 요약 5168건과 요청한 사례 페이지만 읽고 페이지 크기 변경은 처음으로 이동한다', async () => {
  const { context, page, requests, failures } = await pageFixture(false, { caseCount: 5168 })
  try {
    await page.getByLabel('검토 표현 선택').check()
    await page.getByRole('button', { name: '선택 후보 오차단 테스트' }).click()
    const cases = page.getByRole('region', { name: '검사 사례 페이지', exact: true })
    await cases.getByText('검사 사례 1~20 / 5168건', { exact: true }).waitFor()
    assert.equal(await cases.locator('details').count(), 20)
    assert.equal(
      await page.getByRole('button', { name: '검사한 후보 승인 적용' }).isEnabled(),
      true,
    )
    await cases
      .getByRole('navigation', { name: '검사 사례 페이지 이동' })
      .getByRole('button', { name: '2', exact: true })
      .click()
    await cases.getByText('검사 사례 21~40 / 5168건', { exact: true }).waitFor()
    assert.equal(await cases.locator('details').count(), 20)
    await cases.getByLabel('페이지당 검사 사례 수').selectOption('50')
    await cases.getByText('검사 사례 1~50 / 5168건', { exact: true }).waitFor()
    assert.equal(await cases.locator('details').count(), 50)
    const pages = requests.filter((request) => request.p.endsWith('/cases'))
    assert.equal(
      pages.some((request) => request.query === '?page=0&size=20'),
      true,
    )
    assert.equal(
      pages.some((request) => request.query === '?page=1&size=20'),
      true,
    )
    assert.equal(
      pages.some((request) => request.query === '?page=0&size=50'),
      true,
    )
    assert.equal(
      pages.every((request) =>
        [0, 1].includes(Number(new URLSearchParams(request.query).get('page'))),
      ),
      true,
    )
    assert.equal(
      pages.every((request) => request.method === 'GET'),
      true,
    )
    assert.equal(
      pages.every((request) => request.headers.authorization?.startsWith('Bearer fixture.')),
      true,
    )
    assert.deepEqual(failures, [])
  } finally {
    await context.close()
  }
})

test('사례 페이지의 일시 오류는 요약을 폐기하지 않고 같은 페이지만 다시 조회한다', async () => {
  const { context, page, state, requests, failures } = await pageFixture(false, {
    casePageUnavailable: true,
  })
  try {
    await page.getByLabel('검토 표현 선택').check()
    await page.getByRole('button', { name: '선택 후보 오차단 테스트' }).click()
    const cases = page.getByRole('region', { name: '검사 사례 페이지', exact: true })
    await cases.getByRole('alert').filter({ hasText: '검사 사례 조회 일시 실패' }).waitFor()
    assert.equal(
      await page.getByRole('button', { name: '검사한 후보 승인 적용' }).isEnabled(),
      true,
    )
    // 개발 모드의 취소된 초기 요청 수와 무관하게, 복구 뒤 명시적 재조회 한 번을 확인합니다.
    const attemptsBeforeRetry = requests.filter((request) => request.p.endsWith('/cases')).length
    state.casePageRecovered = true
    await cases.getByRole('button', { name: '검사 사례 다시 불러오기' }).click()
    await cases.getByText('검사 사례 1~1 / 1건', { exact: true }).waitFor()
    assert.equal(
      requests.filter((request) => request.p.endsWith('/cases')).length,
      attemptsBeforeRetry + 1,
    )
    assert.equal(requests.filter((request) => request.p.endsWith('/validation')).length, 1)
    assert.deepEqual(failures, [])
  } finally {
    await context.close()
  }
})

test('사례 조회에서 만료되면 저장된 요약으로 승인하지 않는다', async () => {
  const { context, page, requests, failures } = await pageFixture(false, { expiredCasePage: true })
  try {
    await page.getByLabel('검토 표현 선택').check()
    await page.getByRole('button', { name: '선택 후보 오차단 테스트' }).click()
    await page.getByText('검사 상세의 보관기간이 만료됐습니다. 다시 검사해 주세요.').waitFor()
    assert.equal(
      await page.getByRole('button', { name: '검사한 후보 승인 적용' }).isDisabled(),
      true,
    )
    assert.equal(
      await page.getByRole('region', { name: '검사 사례 페이지', exact: true }).count(),
      0,
    )
    assert.equal(
      requests.some((request) => request.p.endsWith('/approval')),
      false,
    )
    assert.deepEqual(failures, [])
  } finally {
    await context.close()
  }
})

test('새 사례 페이지의 원문 HTML도 텍스트로 표시한다', async () => {
  const { context, page, failures } = await pageFixture(false, { unsafeCase: true })
  try {
    await page.getByLabel('검토 표현 선택').check()
    await page.getByRole('button', { name: '선택 후보 오차단 테스트' }).click()
    const cases = page.getByRole('region', { name: '검사 사례 페이지', exact: true })
    await cases.locator('details summary').first().click()
    await cases.getByText('<script>window.caseScriptRan=true</script>', { exact: true }).waitFor()
    assert.equal(await cases.locator('script').count(), 0)
    assert.equal(await page.evaluate(() => window.caseScriptRan), undefined)
    assert.deepEqual(failures, [])
  } finally {
    await context.close()
  }
})

test('마지막 일부 사례와 10개 페이지 크기도 서버가 반환한 전체 건수로 표시한다', async () => {
  const { context, page, requests, failures } = await pageFixture(false, { caseCount: 21 })
  try {
    await page.getByLabel('검토 표현 선택').check()
    await page.getByRole('button', { name: '선택 후보 오차단 테스트' }).click()
    const cases = page.getByRole('region', { name: '검사 사례 페이지', exact: true })
    await cases.getByText('검사 사례 1~20 / 21건', { exact: true }).waitFor()
    await cases.getByRole('button', { name: '2', exact: true }).click()
    await cases.getByText('검사 사례 21~21 / 21건', { exact: true }).waitFor()
    assert.equal(await cases.locator('details').count(), 1)
    await cases.getByLabel('페이지당 검사 사례 수').selectOption('10')
    await cases.getByText('검사 사례 1~10 / 21건', { exact: true }).waitFor()
    await cases.getByRole('button', { name: '3', exact: true }).click()
    await cases.getByText('검사 사례 21~21 / 21건', { exact: true }).waitFor()
    assert.equal(
      requests.some((request) => request.query === '?page=2&size=10'),
      true,
    )
    assert.deepEqual(failures, [])
  } finally {
    await context.close()
  }
})

for (const field of ['falsePositives', 'regressions']) {
  test(`현재 사례 페이지에 문제가 없어도 전체 요약의 ${field}가 있으면 승인하지 않는다`, async () => {
    const { context, page, requests, failures } = await pageFixture(false, {
      caseCount: 21,
      summary: { [field]: 1 },
    })
    try {
      await page.getByLabel('검토 표현 선택').check()
      await page.getByRole('button', { name: '선택 후보 오차단 테스트' }).click()
      const cases = page.getByRole('region', { name: '검사 사례 페이지', exact: true })
      await cases.getByText('검사 사례 1~20 / 21건', { exact: true }).waitFor()
      assert.equal(await cases.getByText('변화 없음', { exact: false }).count(), 20)
      assert.equal(
        await page.getByRole('button', { name: '검사한 후보 승인 적용' }).isDisabled(),
        true,
      )
      assert.equal(
        requests.some((request) => request.p.endsWith('/approval')),
        false,
      )
      assert.deepEqual(failures, [])
    } finally {
      await context.close()
    }
  })
}

test('잘못된 result 객체는 사례를 읽거나 승인하지 않고 재검사를 안내한다', async () => {
  const { context, page, requests, failures } = await pageFixture(false, {
    summary: { caseCount: '5168' },
  })
  try {
    await page.getByLabel('검토 표현 선택').check()
    await page.getByRole('button', { name: '선택 후보 오차단 테스트' }).click()
    await page.getByText('검사 결과 요약을 읽지 못했습니다. 다시 검사해 주세요.').waitFor()
    assert.equal(
      await page.getByRole('button', { name: '검사한 후보 승인 적용' }).isDisabled(),
      true,
    )
    assert.equal(
      requests.some((request) => request.p.endsWith('/cases')),
      false,
    )
    assert.equal(
      requests.some((request) => request.p.endsWith('/approval')),
      false,
    )
    assert.deepEqual(failures, [])
  } finally {
    await context.close()
  }
})

test('검사 사례가 0건이면 빈 결과를 표시하고 승인하지 않는다', async () => {
  const { context, page, requests, failures } = await pageFixture(false, { caseCount: 0 })
  try {
    await page.getByLabel('검토 표현 선택').check()
    await page.getByRole('button', { name: '선택 후보 오차단 테스트' }).click()
    const cases = page.getByRole('region', { name: '검사 사례 페이지', exact: true })
    await cases.getByText('표시할 검사 사례가 없습니다.', { exact: true }).waitFor()
    assert.equal(
      await page.getByRole('button', { name: '검사한 후보 승인 적용' }).isDisabled(),
      true,
    )
    assert.equal(
      requests.some((request) => request.p.endsWith('/approval')),
      false,
    )
    assert.deepEqual(failures, [])
  } finally {
    await context.close()
  }
})

test('후보 수정 뒤 늦게 도착한 이전 사례 응답으로 결과 화면을 복구하지 않는다', async () => {
  const { context, page, requests, failures } = await pageFixture()
  let releaseResponse, notifyStarted, notifyFinished
  const released = new Promise((resolve) => {
    releaseResponse = resolve
  })
  const started = new Promise((resolve) => {
    notifyStarted = resolve
  })
  const finished = new Promise((resolve) => {
    notifyFinished = resolve
  })
  await page.route('**/api/admin/guard-review/runs/11/cases?*', async (route) => {
    notifyStarted()
    await released
    try {
      await route.fulfill({
        json: {
          success: true,
          data: {
            content: [
              {
                id: 'old-delayed-case',
                stage: 'INPUT',
                before: '이전 검사 원문',
                after: '이전 검사 원문',
              },
            ],
            page: 0,
            size: 20,
            totalElements: 1,
            totalPages: 1,
            first: true,
            last: true,
          },
        },
      })
    } finally {
      notifyFinished()
    }
  })
  try {
    await page.getByLabel('검토 표현 선택').check()
    await page.getByRole('button', { name: '선택 후보 오차단 테스트' }).click()
    await started
    await page.getByRole('button', { name: '후보 수정', exact: true }).click()
    await page.getByLabel('후보 표현').fill('새로운 후보 표현')
    await page.getByRole('button', { name: '후보 저장' }).click()
    await page.getByLabel('새로운 후보 표현 선택').waitFor()
    releaseResponse()
    await finished
    assert.equal(
      await page.getByRole('region', { name: '검사 사례 페이지', exact: true }).count(),
      0,
    )
    assert.equal(await page.getByText('old-delayed-case', { exact: false }).count(), 0)
    assert.equal(
      await page.getByRole('button', { name: '검사한 후보 승인 적용' }).isDisabled(),
      true,
    )
    assert.equal(
      requests.some((request) => request.p.endsWith('/approval')),
      false,
    )
    assert.deepEqual(failures, [])
  } finally {
    releaseResponse()
    await context.close()
  }
})
