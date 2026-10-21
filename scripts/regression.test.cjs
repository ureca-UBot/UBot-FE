const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const { startServer, launchBrowser, sleep } = require('./test-support/browser.cjs')
const { installFixtures, token, pageOf, faq } = require('./test-support/fixtures.cjs')

let server, browser
before(async () => {
  server = await startServer(path.resolve(__dirname, '..'), 4182)
  browser = await launchBrowser()
})
after(async () => {
  await browser?.close()
  server?.close()
})

async function withPage(role, run) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 960 },
    reducedMotion: 'reduce',
  })
  const fixtures = await installFixtures(context, role)
  const page = await context.newPage()
  page.setDefaultTimeout(8000)
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  const goto = (route) => page.goto(`${server.origin}/#${route}`)
  try {
    await run({ page, context, fixtures, goto })
    assert.deepEqual(errors, [], 'No uncaught application errors')
    assert.deepEqual(fixtures.unknown, [], 'Every API request must match its contract')
  } finally {
    await context.close()
  }
}

const ok = (route, data) => route.fulfill({ json: { success: true, data } })
const fail = (route, message, code = 'TEST-500', status = 500) =>
  route.fulfill({ status, json: { success: false, message, code } })

test('FAQ 검색: 늦게 도착한 이전 응답은 최신 검색을 덮지 않는다', async () => {
  await withPage('ADMIN', async ({ page, context, goto }) => {
    let release, started
    const pending = new Promise((resolve) => {
      release = resolve
    })
    const received = new Promise((resolve) => {
      started = resolve
    })
    await context.route('**/api/admin/faqs?**', async (route) => {
      const keyword = new URL(route.request().url()).searchParams.get('keyword')
      if (keyword === 'old') {
        started()
        await pending
      }
      return ok(
        route,
        pageOf([
          {
            ...faq,
            question:
              keyword === 'old' ? '이전 응답' : keyword === 'new' ? '최신 응답' : faq.question,
          },
        ]),
      )
    })
    await goto('/admin/faqs')
    const input = page.getByPlaceholder('질문 또는 답변 검색')
    await input.fill('old')
    await page.getByRole('button', { name: '검색', exact: true }).click()
    await received
    await input.fill('new')
    await page.getByRole('button', { name: '검색', exact: true }).click()
    await page.getByText('최신 응답', { exact: true }).waitFor()
    release()
    await sleep(200)
    assert.equal(await page.getByText('이전 응답', { exact: true }).count(), 0)
    assert.equal(await page.getByText('최신 응답', { exact: true }).count(), 1)
  })
})

test('FAQ 조회와 카테고리 실패를 표시하고 재시도로 복구한다', async () => {
  await withPage('ADMIN', async ({ page, context, goto }) => {
    let failed = true
    await context.route('**/api/admin/faqs?**', (route) =>
      failed ? fail(route, '목록 조회 실패') : route.fallback(),
    )
    await context.route('**/api/admin/faq-categories?**', (route) =>
      failed ? fail(route, '카테고리 조회 실패') : route.fallback(),
    )
    await goto('/admin/faqs')
    await page.getByText('목록 조회 실패', { exact: false }).waitFor()
    await page.getByText('카테고리 조회 실패', { exact: false }).waitFor()
    failed = false
    await page.getByRole('button', { name: '다시 시도', exact: true }).click()
    await page.getByRole('button', { name: '카테고리 다시 시도', exact: true }).click()
    await page.getByText(faq.question, { exact: true }).waitFor()
    await page.waitForFunction(() => document.querySelectorAll('[role="alert"]').length === 0)
    assert.equal(await page.locator('.faq-search select option').count(), 2)
  })
})

test('FAQ 모달은 포커스를 가두고 Escape로 닫은 뒤 호출 버튼으로 돌아간다', async () => {
  await withPage('ADMIN', async ({ page, fixtures, goto }) => {
    await goto('/admin/faqs')
    const opener = page.getByRole('button', { name: 'FAQ 생성', exact: true })
    await opener.click()
    const modal = page.getByRole('dialog', { name: 'FAQ 생성' })
    assert.equal(await modal.evaluate((el) => el.contains(document.activeElement)), true)
    await modal.getByRole('button', { name: '확인', exact: true }).focus()
    await page.keyboard.press('Tab')
    assert.equal(
      await modal
        .getByLabel('카테고리', { exact: true })
        .evaluate((el) => el === document.activeElement),
      true,
    )
    await page.keyboard.press('Shift+Tab')
    assert.equal(
      await modal
        .getByRole('button', { name: '확인', exact: true })
        .evaluate((el) => el === document.activeElement),
      true,
    )
    await page.keyboard.press('Escape')
    await modal.waitFor({ state: 'detached' })
    assert.equal(await opener.evaluate((el) => el === document.activeElement), true)
    await opener.click()
    await modal.getByLabel('카테고리', { exact: true }).selectOption('1')
    await modal.getByLabel('질문', { exact: true }).fill('새 FAQ 질문')
    await modal.getByLabel('답변', { exact: true }).fill('새 FAQ 답변')
    await modal.getByRole('button', { name: '확인', exact: true }).click()
    await modal.waitFor({ state: 'detached' })
    await page.getByText('새 FAQ 질문', { exact: true }).waitFor()
    assert.deepEqual(
      fixtures.requests.find((r) => r.path === '/api/admin/faqs' && r.method === 'POST').body,
      {
        categoryId: 1,
        question: '새 FAQ 질문',
        answer: '새 FAQ 답변',
        intent: 'GENERAL',
        cacheable: false,
        similarQuestions: [],
      },
    )
  })
})

test('사용자 문의 등록·수정과 관리자 답변의 기존 요청 형식을 유지한다', async () => {
  await withPage('USER', async ({ page, fixtures, goto }) => {
    await goto('/my')
    await page.getByRole('button', { name: '문의하기', exact: true }).click()
    const form = page.locator('.inquiry-form')
    await form.getByLabel('제목').fill('등록 문의')
    await form.getByLabel('내용').fill('문의 내용')
    await form.getByRole('button', { name: '등록하기' }).click()
    await page.locator('.inquiry-card').getByText('등록 문의', { exact: true }).waitFor()
    await page.locator('.inquiry-card').getByRole('button', { name: '수정', exact: true }).click()
    await form.getByLabel('제목').fill('수정 문의')
    await form.getByRole('button', { name: '수정하기' }).click()
    await page.locator('.inquiry-card').getByText('수정 문의', { exact: true }).waitFor()
    const mutations = fixtures.requests.filter(
      (r) => r.path.startsWith('/api/inquiries') && r.method !== 'GET',
    )
    assert.equal(mutations.length, 2)
    assert.deepEqual(mutations[0].body, { title: '등록 문의', content: '문의 내용' })
    assert.deepEqual(mutations[1].body, { title: '수정 문의', content: '문의 내용' })
  })
  await withPage('ADMIN', async ({ page, fixtures, goto }) => {
    await goto('/admin/inquiries')
    await page.getByRole('button', { name: '보기', exact: true }).click()
    await page.getByLabel('관리자 답변').fill('답변 내용')
    await page.getByRole('button', { name: '답변 등록 및 완료' }).click()
    await page.getByText('등록된 답변', { exact: true }).waitFor()
    assert.equal(
      fixtures.requests.find(
        (r) => r.path.includes('/api/admin/inquiries/') && r.method === 'PATCH',
      ).body.reply,
      '답변 내용',
    )
    await page.getByRole('button', { name: '닫기', exact: true }).click()
    await page.locator('tbody').getByText('답변 완료', { exact: true }).waitFor()
  })
})

test('방문한 상품 페이지는 검색 입력을 보존하며 뒤로·앞으로 가기를 처리한다', async () => {
  await withPage(null, async ({ page, goto }) => {
    await goto('/store')
    await page.getByRole('tab', { name: '요금제', exact: true }).click()
    const input = page.getByRole('textbox', { name: '요금제 검색어' })
    await input.fill('보존할 검색')
    await page.locator('[data-route="benefits"]:visible').first().click()
    await page.waitForURL('**/#/benefits')
    await page.locator('[data-route="store"]:visible').first().click()
    await page.waitForURL('**/#/store')
    assert.equal(await input.inputValue(), '보존할 검색')
    await page.goBack()
    await page.waitForURL('**/#/benefits')
    assert.equal(await page.locator('body').getAttribute('data-route'), 'benefits')
    await page.goForward()
    await page.waitForURL('**/#/store')
    assert.equal(await input.inputValue(), '보존할 검색')
  })
})

test('기존 대화를 열고 새 AI 질문의 최종 응답 이후 폴링을 중단한다', async () => {
  await withPage('USER', async ({ page, fixtures, goto }) => {
    await goto('/ai')
    await page.getByRole('button', { name: /저장된 대화/ }).click()
    await page.getByText('기존 답변', { exact: true }).waitFor()
    await page.getByRole('textbox', { name: 'AI 검색어' }).fill('새 질문입니다')
    await page.getByRole('button', { name: '질문 보내기' }).click()
    await page.getByText('검증용 AI 답변입니다.', { exact: true }).waitFor()
    const polls = () => fixtures.requests.filter((r) => r.path === '/api/chat/jobs/1').length
    assert.equal(polls(), 1)
    await sleep(1700)
    assert.equal(polls(), 1)
    assert.equal(
      fixtures.requests.find((r) => r.path === '/api/chat/questions').body.question,
      '새 질문입니다',
    )
  })
})

test('동시 토큰 만료는 한 번만 재발급하고 거절된 토큰은 제거한다', async () => {
  await withPage('USER', async ({ page, context, goto }) => {
    await goto('/ai')
    await page.getByRole('button', { name: /저장된 대화/ }).waitFor()
    let refreshes = 0
    await context.route('**/api/auth/refresh', async (route) => {
      refreshes++
      await sleep(150)
      return ok(route, { accessToken: token('USER', '2'), refreshToken: 'rotated' })
    })
    await context.route('**/api/test/session', (route) =>
      route.request().headers().authorization === `Bearer ${token('USER', '2')}`
        ? ok(route, 'restored')
        : fail(route, 'expired', 'JWT-007', 401),
    )
    const result = await page.evaluate(async () => {
      const { apiClient } = await import('/src/shared/api/client.ts')
      return Promise.all([apiClient.get('/api/test/session'), apiClient.get('/api/test/session')])
    })
    assert.deepEqual(result, ['restored', 'restored'])
    assert.equal(refreshes, 1)
    await context.route('**/api/test/rejected', (route) => fail(route, 'rejected', 'JWT-004', 401))
    assert.deepEqual(
      await page.evaluate(async () => {
        const { apiClient } = await import('/src/shared/api/client.ts')
        await apiClient.get('/api/test/rejected').catch(() => {})
        return [sessionStorage.getItem('accessToken'), sessionStorage.getItem('refreshToken')]
      }),
      [null, null],
    )
  })
})

test('라우트 별칭·채팅 상태 전이·표시 형식·지도 좌표 계산을 보존한다', async () => {
  await withPage(null, async ({ page, goto }) => {
    await goto('/')
    const result = await page.evaluate(async () => {
      const routes = await import('/src/user/routes.ts')
      const chat = await import('/src/user/ai/state/chatTransitions.ts')
      const format = await import('/src/shared/product/format.ts')
      const { offsetPathToRight } = await import(
        '/src/user/store-locator/directions/routeGeometry.ts'
      )
      const pending = { id: 1, isPending: true, researches: [] }
      const complete = { id: 2, isPending: false, researches: [] }
      const progress = { status: 'RUNNING', phase: null, remainingMs: 1000 }
      const updated = chat.updateProgress([pending, complete], 1, progress)
      const response = {
        answer: '답변',
        status: 'SUCCESS',
        idempotencyKey: null,
        attemptCount: 1,
        retryable: false,
      }
      return {
        routes: ['/benefit', '/network', '/stores/', '/store/product', '/unknown'].map(
          routes.userPageFromPath,
        ),
        paths: ['home', 'stores', 'ai'].map(routes.userPagePath),
        immutable:
          pending.progress === undefined &&
          updated[1] === complete &&
          updated[0].progress === progress,
        valid: [null, {}, response, { ...response, attemptCount: -1 }].map(chat.isChatResponse),
        retained: [
          [null, '1'],
          ['1', '2'],
          ['1', null],
        ].map(([a, b]) => chat.keepsConversation(a, b)),
        settled: await chat.settleRequest(async () => response),
        data: [0, 1023, 1024, 1536].map(format.formatDataAmount),
        price: format.formatWon(33000),
        path: offsetPathToRight(
          [
            { x: 0, y: 0 },
            { x: 10, y: 0 },
          ],
          { toScreen: (v) => v, fromScreen: (v) => v },
          3,
        ),
      }
    })
    assert.deepEqual(result.routes, ['benefits', 'support', 'stores', 'product', 'home'])
    assert.deepEqual(result.paths, ['/', '/support/store-address', '/ai'])
    assert.equal(result.immutable, true)
    assert.deepEqual(result.valid, [false, false, true, false])
    assert.deepEqual(result.retained, [true, false, false])
    assert.equal(result.settled.error, null)
    assert.equal(result.settled.response.answer, '답변')
    assert.deepEqual(result.data, ['0MB', '1,023MB', '1GB', '1.5GB'])
    assert.equal(result.price, '33,000원')
    assert.deepEqual(result.path, [
      { x: 0, y: 3 },
      { x: 10, y: 3 },
    ])
  })
})
