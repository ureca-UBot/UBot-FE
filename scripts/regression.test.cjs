const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const { startServer, launchBrowser, sleep } = require('./test-support/browser.cjs')
const {
  installFixtures,
  token,
  pageOf,
  faq,
  improvement,
  overview,
} = require('./test-support/fixtures.cjs')

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

for (const count of [undefined, null, 0, 15]) {
  test(`기존 개선 API의 추가 지표가 없어도 FAQ를 열고 실제 0건과 미집계를 구분한다 (${count})`, async () => {
    await withPage('ADMIN', async ({ page, context, goto }) => {
      await context.route('**/api/admin/faq-monitoring/improvements?**', (route) =>
        ok(route, {
          items: [{ ...improvement, reviewableTopKCount: count, recentUsageCount: 2 }],
          evaluatedAt: '2026-10-20T12:00:00',
          page: 0,
          size: 5,
          totalElements: 1,
          totalPages: 1,
          first: true,
          last: true,
        }),
      )
      await goto('/admin/dashboard')
      await page.locator('.faq-dashboard-improvement-table tbody tr').first().click()
      const metric = page
        .locator('.faq-dashboard-improvement-metrics > div')
        .filter({ hasText: '검토 가능 Top-K 건수' })
        .locator('strong')
      await metric.waitFor()
      assert.equal(await metric.innerText(), count == null ? '-' : String(count))
      assert.equal(await page.locator('.faq-dashboard').count(), 1)
      await page.getByRole('button', { name: 'AI 검토', exact: true }).click()
      await page.getByRole('dialog', { name: 'FAQ AI 검토' }).waitFor()
    })
  })
}

for (const width of [1440, 1280, 1024, 390]) {
  test(`FAQ 상세 카드의 사용량 그래프와 표가 카드 밖으로 잘리지 않는다 (${width}px)`, async () => {
    await withPage('ADMIN', async ({ page, goto }) => {
      await page.setViewportSize({ width, height: 800 })
      await goto('/admin/dashboard')
      await page.getByRole('textbox', { name: 'FAQ ID', exact: true }).fill('1')
      await page.locator('.faq-dashboard-detail__search button').click()
      await page
        .locator('.faq-dashboard-detail__basic b')
        .first()
        .filter({ hasText: faq.question })
        .waitFor()
      const layout = await page.locator('.faq-dashboard-section--detail').evaluate((section) => {
        const bounds = section.getBoundingClientRect()
        return {
          width: section.clientWidth,
          contentWidth: section.scrollWidth,
          inside: [
            ...section.querySelectorAll(
              '.faq-dashboard-detail__basic,.faq-dashboard-detail__trend,.faq-dashboard-cooccurring',
            ),
          ].every((item) => item.getBoundingClientRect().right <= bounds.right + 1),
        }
      })
      assert.ok(layout.contentWidth <= layout.width + 1, JSON.stringify(layout))
      assert.equal(layout.inside, true)
    })
  })
}

test('운영 차트는 축 숫자를 끝까지 표시하고 JVM 단위를 구분해 빈 행 없이 배치한다', async () => {
  await withPage('ADMIN', async ({ page, context, goto }) => {
    const data = structuredClone(overview)
    const points = (values) =>
      values.map((value, index) => ({ at: `2026-10-20T12:0${index}:00Z`, value }))
    data.series.apiRps = points([0.2, 1.2, 0.5])
    data.series.errorRate.server5xx = points([0.05, 0.8, 1])
    data.series.apiLatencyMillis.p99 = points([1500, 3500, 15000])
    data.series.backend.liveThreads = points([45, 48, 50])
    data.series.backend.jvmHeapUsageRate = points([0.2, 0.25, 0.3])
    data.series.backend.gcPauseSecondsPerSecond = points([0.001, 0.002, 0.0001])
    data.series.containers.memoryBytes = {
      backend: points([1_000_000_000, 1_800_000_000, 1_500_000_000]),
    }
    await context.route('**/api/admin/operation-monitoring/services/overview?**', (route) =>
      ok(route, data),
    )
    await page.setViewportSize({ width: 1440, height: 1000 })
    await goto('/admin/operation')
    await page.locator('.operation-chart-card .recharts-yAxis-tick-labels text').first().waitFor()
    assert.equal(await page.locator('.operation-charts').count(), 1)
    assert.equal(await page.locator('.operation-chart-card').count(), 9)
    for (const heading of ['백엔드 CPU·Heap 사용률', 'JVM GC 중지 시간', 'JVM 스레드 수'])
      await page.getByRole('heading', { name: heading, exact: true }).waitFor()
    const clipped = await page.locator('.operation-chart').evaluateAll((charts) =>
      charts.flatMap((chart) => {
        const bounds = chart.querySelector('svg[role="application"]').getBoundingClientRect()
        return [...chart.querySelectorAll('.recharts-yAxis-tick-labels text')]
          .filter(
            (tick) =>
              tick.getBoundingClientRect().left < bounds.left - 1 ||
              tick.getBoundingClientRect().right > bounds.right + 1,
          )
          .map((tick) => tick.textContent)
      }),
    )
    assert.deepEqual(clipped, [])
    await page.screenshot({
      path: path.join(__dirname, '../test-results/operation-fixed.png'),
      fullPage: true,
    })
    await page.setViewportSize({ width: 390, height: 844 })
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    )
  })
})

test('상담 오류 코드는 표 오른쪽에서 전체 내용이 줄바꿈되어 보인다', async () => {
  await withPage('ADMIN', async ({ page, context, goto }) => {
    const errorCode = 'EMBEDDING_WORKER_RESPONSE_TIMEOUT_WITHOUT_READY_PROFILE'
    await context.route('**/api/admin/counsel/safety/summary?**', (route) =>
      ok(route, { total: 1, allowed: 0, blocked: 0, checkFailed: 1, falsePositives: 0 }),
    )
    await context.route('**/api/admin/counsel/safety/events?**', (route) =>
      ok(route, {
        items: [
          {
            id: 1,
            createdAt: '2026-10-20T12:00:00Z',
            sessionId: '00000000-0000-0000-0000-000000000001',
            senderRole: 'USER',
            decision: 'CHECK_FAILED',
            category: null,
            score: null,
            threshold: 0.95,
            modelName: 'ubot-embedding',
            profileVersion: 'insult-v1',
            ruleVersion: 'direct-v1',
            errorCode,
          },
        ],
        page: 0,
        hasNext: false,
      }),
    )
    await goto('/admin/counsel-safety')
    const cell = page.locator('td.counsel-error-cell')
    await cell.waitFor()
    assert.equal(await cell.innerText(), errorCode)
    const layout = await cell.evaluate((e) => ({
      width: e.clientWidth,
      contentWidth: e.scrollWidth,
      right: e.getBoundingClientRect().right,
      tableRight: e.closest('.counsel-table-wrap').getBoundingClientRect().right,
    }))
    assert.ok(layout.contentWidth <= layout.width + 1, JSON.stringify(layout))
    assert.ok(layout.right <= layout.tableRight + 1, JSON.stringify(layout))
    await page.screenshot({
      path: path.join(__dirname, '../test-results/counsel-errors-fixed.png'),
      fullPage: true,
    })
  })
})

for (const width of [1440, 768, 390, 320]) {
  test(`관리자가 로그인 상태를 유지하며 홈과 관리자 화면을 왕복한다 (${width}px)`, async () => {
    await withPage('ADMIN', async ({ page, fixtures, goto }) => {
      await page.setViewportSize({ width, height: 960 })
      await goto('/admin/faqs')
      const accessToken = await page.evaluate(() => sessionStorage.getItem('accessToken'))
      await page.getByRole('link', { name: '홈 화면', exact: true }).click()
      await page.waitForURL('**/#/ai')
      const back = page
        .getByRole('link', { name: '관리자 화면', exact: true })
        .filter({ visible: true })
      await back.waitFor()
      const bounds = await back.boundingBox()
      assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width)
      await page.screenshot({
        path: path.join(__dirname, `../test-results/admin-home-${width}.png`),
      })
      await back.click()
      await page.waitForURL('**/#/admin/dashboard')
      await page.locator('.admin-main').waitFor()
      assert.equal(await page.evaluate(() => sessionStorage.getItem('accessToken')), accessToken)
      assert.equal(
        fixtures.requests.some(({ path }) => path === '/api/auth/logout'),
        false,
      )
    })
  })
}

for (const role of ['USER', null]) {
  test(`관리자 외 계정에는 관리자 이동 버튼이 표시되지 않는다 (${role ?? '비회원'})`, async () => {
    await withPage(role, async ({ page, goto }) => {
      await goto('/ai')
      await page.locator('.ubot-user-app').waitFor()
      assert.equal(await page.getByRole('link', { name: '관리자 화면', exact: true }).count(), 0)
    })
  })
}

test('예약 시간 조회 실패를 로딩과 구분하고 다시 불러온 뒤 예약을 한 번만 접수한다', async () => {
  await withPage('USER', async ({ page, context, goto }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    let failed = true
    let submitted = 0
    let release
    const pending = new Promise((resolve) => {
      release = resolve
    })
    await context.route('**/api/stores/1/reservation-slots?**', (route) =>
      failed ? fail(route, '시간 조회 실패') : ok(route, [{ time: '10:00:00', available: true }]),
    )
    await context.route('**/api/reservations', async (route) => {
      submitted += 1
      await pending
      return ok(route, { reservationId: 1, storeName: '강남점' })
    })
    await goto('/my')
    await page.locator('.my-member:not(.hidden)').waitFor()
    await page.evaluate(() => {
      document.dispatchEvent(
        new CustomEvent('ubot:reserve-store', {
          detail: { id: 1, name: '강남점' },
        }),
      )
    })
    try {
      await page.getByRole('alert').filter({ hasText: '시간 조회 실패' }).waitFor()
      const bounds = await page.locator('dialog[open]').boundingBox()
      assert.ok(
        bounds.x >= 0 && bounds.x + bounds.width <= 390,
        '작은 화면 안에 예약 창이 표시된다',
      )
      await page.screenshot({ path: path.join(__dirname, '../test-results/reservation-error.png') })
      assert.equal(await page.getByRole('option', { name: '불러오는 중...' }).count(), 0)
      assert.equal(
        await page.getByRole('button', { name: '예약 완료', exact: true }).isDisabled(),
        true,
      )
      failed = false
      await page.getByRole('button', { name: '예약 시간 다시 불러오기' }).click()
      await page.waitForFunction(
        () => document.querySelector('select[required]')?.value === '10:00:00',
      )
      await page.getByRole('button', { name: '예약 완료', exact: true }).evaluate((button) => {
        button.click()
        button.click()
      })
      await page.waitForFunction(() =>
        document.querySelector('button[type="submit"]')?.textContent?.includes('예약 중'),
      )
      release()
      await page.getByRole('status').filter({ hasText: '방문 예약이 완료' }).waitFor()
      assert.equal(submitted, 1)
      assert.equal(await page.getByRole('alert').count(), 0)
    } finally {
      release()
    }
  })
})

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
      await modal.getByLabel(/카테고리/).evaluate((el) => el === document.activeElement),
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
    await modal.getByLabel(/카테고리/).selectOption('1')
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
    await goto('/customer-center')
    await page.getByRole('button', { name: '문의하기', exact: true }).click()
    const form = page.locator('.inquiry-form')
    const listBounds = await page.locator('.my-inquiries').boundingBox()
    const composeBounds = await page.locator('.inquiry-compose').boundingBox()
    assert.ok(composeBounds.y >= listBounds.y + listBounds.height)
    assert.equal(composeBounds.width, listBounds.width)
    assert.equal(await page.getByRole('dialog').count(), 0)
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
    await page.locator('.desktop-header [data-route="customer"]').click()
    await page.waitForURL('**/#/customer-center')
    await page.locator('.desktop-header [data-route="store"]').click()
    await page.waitForURL('**/#/store')
    assert.equal(await input.inputValue(), '보존할 검색')
    await page.goBack()
    await page.waitForURL('**/#/customer-center')
    assert.equal(await page.locator('body').getAttribute('data-route'), 'customer')
    await page.goForward()
    await page.waitForURL('**/#/store')
    assert.equal(await input.inputValue(), '보존할 검색')
  })
})

test('상품 검색 조건은 유지하고 더 보기·실패한 페이지 재시도·상세 조회를 보존한다', async () => {
  await withPage(null, async ({ page, context, goto }) => {
    const plan = (id) => ({
      planId: id,
      planCode: `PLAN_${id}`,
      name: `검색 결과 요금제 ${id}`,
      networkType: 'FIVE_G',
      targetGroup: 'GENERAL',
      monthlyFee: 33000,
      dataAmountMb: 1024,
      dataUnlimited: false,
      exhaustedSpeedKbps: null,
      voiceMinutes: 100,
      voiceUnlimited: false,
      smsCount: 100,
      smsUnlimited: false,
    })
    const calls = []
    let failNextPage = true
    await context.route('**/api/plans?**', (route) => {
      const query = new URL(route.request().url()).searchParams
      const requestedPage = Number(query.get('page'))
      calls.push({ page: requestedPage, keyword: query.get('keyword') })
      if (requestedPage === 1 && failNextPage) {
        failNextPage = false
        return fail(route, '다음 페이지 조회 실패')
      }
      return ok(route, {
        ...pageOf([plan(requestedPage + 1)]),
        number: requestedPage,
        totalElements: 2,
        totalPages: 2,
        last: requestedPage === 1,
      })
    })
    await context.route('**/api/plans/1', (route) =>
      ok(route, {
        summary: plan(1),
        description: '샘플 요금제 상세',
        tetheringAmountMb: 1024,
        minAge: null,
        maxAge: null,
      }),
    )
    await context.route('**/api/plans/1/included-addons', (route) => ok(route, []))
    await goto('/store')
    const catalog = page.locator('.product-catalog')
    const input = page.getByRole('textbox', { name: '요금제 검색어', exact: true })
    await catalog.getByRole('heading', { name: '검색 결과 요금제 1', exact: true }).waitFor()
    await input.fill('적용한 검색')
    const searched = page.waitForResponse(
      (response) => new URL(response.url()).searchParams.get('keyword') === '적용한 검색',
    )
    await catalog.getByRole('button', { name: '검색', exact: true }).click()
    await searched
    await catalog.getByRole('button', { name: '더 보기', exact: true }).click()
    await catalog.getByText('다음 페이지 조회 실패', { exact: true }).waitFor()
    await catalog.getByRole('button', { name: '다시 시도', exact: true }).click()
    await catalog.getByRole('heading', { name: '검색 결과 요금제 2', exact: true }).waitFor()
    assert.equal(await catalog.locator('.product-card').count(), 2)
    assert.deepEqual(
      calls.filter((call) => call.keyword === '적용한 검색').map((call) => call.page),
      [0, 1, 1],
    )
    await input.fill('아직 제출하지 않은 검색')
    const beforeLeaving = calls.length
    const menu = page.getByRole('navigation', { name: '주요 메뉴', exact: true })
    await menu.getByRole('button', { name: '공지/장애 안내', exact: true }).click()
    await page.waitForURL('**/#/notices')
    assert.equal(calls.length, beforeLeaving)
    await menu.getByRole('button', { name: '상품 정보', exact: true }).click()
    await catalog.getByRole('heading', { name: '검색 결과 요금제 1', exact: true }).waitFor()
    assert.equal(await input.inputValue(), '아직 제출하지 않은 검색')
    assert.deepEqual(calls.at(-1), { page: 1, keyword: '적용한 검색' })
    assert.equal(calls.length, beforeLeaving)
    assert.equal(await catalog.locator('.product-card').count(), 2)
    await catalog
      .locator('.product-card')
      .filter({ hasText: '검색 결과 요금제 1' })
      .getByRole('button', { name: '자세히 보기', exact: true })
      .click()
    const detail = page.getByRole('dialog')
    await detail.getByText('샘플 요금제 상세', { exact: true }).waitFor()
    await detail.getByRole('button', { name: '닫기', exact: true }).click()
    await detail.waitFor({ state: 'detached' })
  })
})

async function installProductFlowFixtures(context, lines = []) {
  const plan = {
    planId: 1,
    planCode: 'UBOT_BASIC_10',
    name: 'Ubot 베이직 10GB',
    networkType: 'FIVE_G',
    targetGroup: 'GENERAL',
    monthlyFee: 50000,
    dataAmountMb: 10240,
    dataUnlimited: false,
    exhaustedSpeedKbps: 400,
    voiceMinutes: null,
    voiceUnlimited: true,
    smsCount: null,
    smsUnlimited: true,
  }
  const detail = {
    summary: plan,
    description:
      '월 데이터 10GB. 소진 후 최대 0.4Mbps로 계속 이용. 테더링 한도 소진 후 차단. 금융 손해 배상은 제공하지 않습니다.',
    tetheringAmountMb: 10240,
    minAge: null,
    maxAge: null,
  }
  await context.route('**/api/plans?**', (route) => ok(route, pageOf([plan])))
  await context.route('**/api/plans/1', (route) => ok(route, detail))
  await context.route('**/api/plans/1/included-addons', (route) =>
    ok(route, [
      {
        addonServiceId: 1,
        code: 'PHISHING',
        name: 'Ubot 피싱가드',
        category: 'SAFETY',
        monthlyFee: 2200,
        description: null,
      },
      {
        addonServiceId: 2,
        code: 'DEVICE',
        name: 'Ubot 디바이스 케어',
        category: 'SAFETY',
        monthlyFee: 4400,
        description: null,
      },
    ]),
  )
  await context.route('**/api/subscriptions/me', (route) => ok(route, lines))
  return { plan, detail }
}

test('상단 어느 메뉴에 올려도 전체 하위 목록이 열리고 상품 분류 버튼은 서버 필터로 연결한다', async () => {
  await withPage('USER', async ({ page, context, goto }) => {
    await installProductFlowFixtures(context)
    let category
    await context.route('**/api/addon-services?**', (route) => {
      category = new URL(route.request().url()).searchParams.get('category')
      return ok(route, pageOf([]))
    })
    await goto('/store')
    const trigger = page.locator('.gnb button[data-route="store"]')
    await trigger.hover()
    const menu = page.locator('#header-menu-all')
    await menu.waitFor({ state: 'visible' })
    const links = await menu.getByRole('link').allTextContents()
    for (const button of await page.locator('.gnb > .gnb-item > button').all()) {
      await button.hover()
      await menu.waitFor({ state: 'visible' })
      assert.deepEqual(await menu.getByRole('link').allTextContents(), links)
    }
    await menu.getByRole('link', { name: '부가서비스', exact: true }).click()
    const filters = page.getByRole('group', { name: '부가서비스 분류', exact: true })
    const response = page.waitForResponse(
      (item) =>
        item.url().includes('/api/addon-services?') && item.url().includes('category=SAFETY'),
    )
    await filters.getByRole('button', { name: '안심·보호', exact: true }).click()
    await response
    assert.equal(category, 'SAFETY')
    assert.equal(
      await filters
        .getByRole('button', { name: '안심·보호', exact: true })
        .getAttribute('aria-pressed'),
      'true',
    )
    assert.match(page.url(), /category=addons/)
    await trigger.hover()
    await menu.waitFor({ state: 'visible' })
    await page.keyboard.press('Escape')
    await menu.waitFor({ state: 'hidden' })
    assert.equal(await trigger.getAttribute('aria-expanded'), 'false')
  })
})

test('고객센터 하위 메뉴와 공개 FAQ는 실제 질문·답변 및 상담 버튼으로 연결한다', async () => {
  await withPage(null, async ({ page, goto }) => {
    await goto('/customer-center?section=faq')
    const question = page.locator('.customer-faq summary').filter({ hasText: faq.question })
    await question.click()
    await page.locator('.customer-faq').getByText(faq.answer, { exact: true }).waitFor()
    await page.locator('.gnb button[data-route="customer"]').hover()
    const menu = page.locator('#header-menu-all .mega-column[aria-label="고객센터"]')
    assert.deepEqual(await menu.getByRole('link').allTextContents(), [
      '문의',
      '상담사 연결',
      'AI 챗봇',
      'FAQ',
    ])
    await menu.getByRole('link', { name: '상담사 연결', exact: true }).click()
    await page.waitForFunction(() => document.activeElement?.classList.contains('ai-counsel-link'))
    assert.match(page.url(), /ai\?focus=counsel/)
  })
})

test('우측 하단 Ubot은 모바일 크기로 열리고 전체 채팅과 같은 대화를 유지한다', async () => {
  await withPage('USER', async ({ page, goto }) => {
    await goto('/customer-center')
    await page.getByRole('button', { name: 'Ubot 챗봇 열기', exact: true }).click()
    const panel = page.getByRole('dialog', { name: 'Ubot 채팅', exact: true })
    await panel.getByLabel('AI 채팅 입력', { exact: true }).fill('모의 질문')
    await panel.getByRole('button', { name: '질문 보내기', exact: true }).click()
    await panel.getByText('검증용 AI 답변입니다.', { exact: true }).waitFor()
    const bounds = await panel.boundingBox()
    assert.ok(bounds.width > 400 && bounds.width <= 520)
    await panel.getByRole('link', { name: '통합 채팅', exact: true }).click()
    await page
      .locator('.ai-chat-view:visible')
      .getByText('검증용 AI 답변입니다.', { exact: true })
      .waitFor()
    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByRole('button', { name: 'Ubot 챗봇 열기', exact: true }).click()
    await panel.waitFor({ state: 'visible' })
    const mobileBounds = await panel.boundingBox()
    assert.ok(mobileBounds.x >= 0 && mobileBounds.x + mobileBounds.width <= 390)
    await page.keyboard.press('Escape')
    await panel.waitFor({ state: 'hidden' })
    assert.equal(
      await page
        .getByRole('button', { name: 'Ubot 챗봇 열기' })
        .evaluate((item) => item === document.activeElement),
      true,
    )
  })
})

test('상품명은 5GB·소수 용량·Gbps를 나누지 않고 5G 통신망과 구분한다', async () => {
  await withPage(null, async ({ page, context, goto }) => {
    const { plan } = await installProductFlowFixtures(context)
    const amounts = ['5GB', '15GB', '0.5GB', '5Gbps', '5gb']
    const names = amounts.map((amount) => `Ubot 데이터 ${amount}`)
    names.push('Ubot 5G 베이직')
    await context.route('**/api/plans?**', (route) =>
      ok(route, pageOf(names.map((name, index) => ({ ...plan, planId: index + 1, name })))),
    )
    await goto('/store')
    await page.getByRole('heading', { name: names.at(-1), exact: true }).waitFor()
    for (const [index, amount] of amounts.entries()) {
      const heading = page.getByRole('heading', { name: names[index], exact: true })
      assert.equal(await heading.locator('.product-name-amount').textContent(), amount)
      assert.equal(await heading.locator('.product-name-network').count(), 0)
      assert.equal(await heading.textContent(), names[index])
    }
    const network = page.getByRole('heading', { name: 'Ubot 5G 베이직', exact: true })
    assert.equal(await network.locator('.product-name-network').textContent(), '5G')
  })
})

test('로밍 등급은 같은 보라색으로 강조하고 카드 이미지 클릭과 키보드로 상세를 연다', async () => {
  await withPage(null, async ({ page, context, goto }) => {
    const products = ['베이직', '플러스', '맥스'].map((tier, index) => ({
      roamingProductId: index + 1,
      code: `ROAMING_${index}`,
      name: `Ubot 로밍 ${tier}`,
      description: '로밍 상세 안내',
      country: '일본',
      dailyFee: 10000,
      dataAmountMb: 1024,
    }))
    await context.route('**/api/roaming-products?**', (route) => ok(route, pageOf(products)))
    await context.route('**/api/roaming-products/1', (route) => ok(route, products[0]))
    await goto('/store?category=roaming')
    const cards = page.locator('.product-card')
    await cards.last().waitFor()
    assert.deepEqual(await cards.locator('.product-name-tier').allTextContents(), [
      '베이직',
      '플러스',
      '맥스',
    ])
    assert.deepEqual(
      await cards
        .locator('.product-name-tier')
        .evaluateAll((items) => items.map((item) => getComputedStyle(item).color)),
      Array(3).fill('rgb(111, 85, 221)'),
    )
    const cover = cards.first().locator('.product-card-cover')
    await cover.scrollIntoViewIfNeeded()
    const bounds = await cover.boundingBox()
    await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
    const detail = page.getByRole('dialog')
    await detail.getByText('로밍 상세 안내', { exact: true }).waitFor()
    await detail.getByRole('button', { name: '닫기', exact: true }).click()
    await cards.first().getByRole('button', { name: '자세히 보기' }).focus()
    await page.keyboard.press('Enter')
    await detail.getByText('로밍 상세 안내', { exact: true }).waitFor()
  })
})

test('상품 상세는 제공 항목과 포함 서비스를 나누고 소수점·제외 조건을 보존한다', async () => {
  await withPage(null, async ({ page, context, goto }) => {
    await installProductFlowFixtures(context)
    await goto('/store')
    await page.locator('.product-card').getByRole('button', { name: '자세히 보기' }).click()
    const detail = page.locator('.product-detail-dialog')
    await detail.getByRole('heading', { name: 'Ubot 베이직 10GB', exact: true }).waitFor()
    assert.equal(await detail.locator('.product-detail-included li').count(), 2)
    assert.equal(await detail.locator('.product-detail-benefits li').count(), 4)
    await detail.getByText('소진 후 최대 0.4Mbps로 계속 이용.', { exact: true }).waitFor()
    await detail.getByText('금융 손해 배상은 제공하지 않습니다.', { exact: true }).waitFor()
    assert.equal(await detail.locator('.product-detail-rows > div').count(), 7)
  })
})

test('상품 가입은 실제 회선만 선택하고 현재 요금제를 제외해 고른 회선으로 변경한다', async () => {
  await withPage('USER', async ({ page, context, goto }) => {
    const { detail } = await installProductFlowFixtures(context, [
      {
        subscriptionId: 11,
        phoneNumber: '010-1111-2222',
        planId: 1,
        planName: '현재 요금제',
        status: 'ACTIVE',
      },
      {
        subscriptionId: 12,
        phoneNumber: '010-3333-4444',
        planId: 2,
        planName: '다른 요금제',
        status: 'ACTIVE',
      },
      {
        subscriptionId: 13,
        phoneNumber: '010-5555-6666',
        planId: 3,
        planName: '정지 회선',
        status: 'SUSPENDED',
      },
    ])
    let changed
    await context.route('**/api/subscriptions/me/12/plan', (route) => {
      changed = { method: route.request().method(), body: route.request().postDataJSON() }
      return ok(route, detail)
    })
    await goto('/store')
    await page.locator('.product-card').getByRole('button', { name: '자세히 보기' }).click()
    await page
      .locator('.product-detail-dialog')
      .getByRole('button', { name: '가입하기', exact: true })
      .click()
    const picker = page.locator('.subscription-action-form')
    await picker.getByText('회선을 골라주세요.', { exact: true }).waitFor()
    await picker.getByRole('radio').last().waitFor({ state: 'attached' })
    assert.equal(await picker.getByRole('radio').count(), 2)
    assert.equal(await picker.locator('select').count(), 0)
    assert.equal(await picker.getByRole('radio').first().isDisabled(), true)
    assert.equal(await picker.getByRole('button', { name: '다음', exact: true }).isDisabled(), true)
    assert.equal(
      await picker.locator('.subscription-line-picker').getByText('새 회선으로 개통').count(),
      0,
    )
    await picker.getByText('010-3333-4444', { exact: true }).click()
    assert.equal(await picker.getByRole('radio').nth(1).isChecked(), true)
    await picker.getByRole('button', { name: '다음', exact: true }).click()
    const change = page.locator('.subscription-action-form')
    await change.getByRole('heading', { name: '요금제 변경', exact: true }).waitFor()
    await change.getByRole('button', { name: '요금제 변경', exact: true }).click()
    await page
      .locator('.product-detail-dialog')
      .getByText(/요금제를 .*바꿨습니다/)
      .waitFor()
    assert.deepEqual(changed, { method: 'PATCH', body: { planId: 1 } })
  })
})

test('회선이 없으면 자동 선택 없이 별도 새 회선 개통 버튼으로 개통한다', async () => {
  await withPage('USER', async ({ page, context, goto }) => {
    await installProductFlowFixtures(context)
    let created
    await context.route('**/api/subscriptions/me', (route) => {
      if (route.request().method() === 'POST') {
        created = route.request().postDataJSON()
        return ok(route, { subscriptionId: 20, phoneNumber: '010-7777-8888' })
      }
      return ok(route, [])
    })
    await goto('/store')
    await page.locator('.product-card').getByRole('button', { name: '자세히 보기' }).click()
    await page
      .locator('.product-detail-dialog')
      .getByRole('button', { name: '가입하기', exact: true })
      .click()
    const picker = page.locator('.subscription-action-form')
    await picker.getByText('이용 중인 회선이 없어요.', { exact: true }).waitFor()
    assert.equal(await picker.getByRole('radio').count(), 0)
    assert.equal(await picker.getByRole('button', { name: '다음', exact: true }).isDisabled(), true)
    await picker.getByRole('button', { name: '새 회선으로 개통' }).click()
    const open = page.locator('.subscription-action-form')
    await open.getByRole('heading', { name: '회선 개통', exact: true }).waitFor()
    await open.getByRole('button', { name: '개통 신청', exact: true }).click()
    await page
      .locator('.product-detail-dialog')
      .getByText(/010-7777-8888 회선을 개통했습니다/)
      .waitFor()
    assert.deepEqual(created, { planId: 1 })
  })
})

test('로밍 국가 버튼은 실제 국가를 표시하고 검색 조건을 유지하며 상품 종류 변경 시 초기화한다', async () => {
  await withPage(null, async ({ page, context, goto }) => {
    const calls = []
    await context.route('**/api/roaming-products?**', (route) => {
      const query = new URL(route.request().url()).searchParams
      const country = query.get('country')
      if (query.get('size') !== '100') calls.push({ keyword: query.get('keyword'), country })
      return ok(
        route,
        pageOf([
          {
            roamingProductId: 1,
            code: 'ROAMING_1',
            name: country ? '일본 로밍 검색 결과' : '전체 로밍 상품',
            description: '샘플 로밍 상품',
            dailyFee: 10000,
            dataAmountMb: 1024,
            country: '일본',
          },
        ]),
      )
    })
    await goto('/store')
    await page.getByRole('tab', { name: '로밍', exact: true }).click()
    const input = page.getByRole('textbox', { name: '로밍 검색어', exact: true })
    const countries = page.getByRole('group', { name: '이용 국가', exact: true })
    await input.fill('하루 로밍')
    await page
      .locator('.product-catalog')
      .getByRole('button', { name: '검색', exact: true })
      .click()
    await countries.getByRole('button', { name: '일본', exact: true }).click()
    await page.getByRole('heading', { name: '일본 로밍 검색 결과', exact: true }).waitFor()
    const beforeLeaving = calls.length
    const menu = page.getByRole('navigation', { name: '주요 메뉴', exact: true })
    await menu.getByRole('button', { name: '공지/장애 안내', exact: true }).click()
    await page.waitForURL('**/#/notices')
    assert.equal(calls.length, beforeLeaving)
    await menu.getByRole('button', { name: '상품 정보', exact: true }).click()
    await page.getByRole('heading', { name: '일본 로밍 검색 결과', exact: true }).waitFor()
    assert.equal(await input.inputValue(), '하루 로밍')
    assert.equal(
      await countries
        .getByRole('button', { name: '일본', exact: true })
        .getAttribute('aria-pressed'),
      'true',
    )
    assert.deepEqual(calls.at(-1), { keyword: '하루 로밍', country: '일본' })
    await page.getByRole('tab', { name: '로밍', exact: true }).click()
    assert.equal(await input.inputValue(), '하루 로밍')
    await page.getByRole('tab', { name: '요금제', exact: true }).click()
    await page.getByRole('tab', { name: '로밍', exact: true }).click()
    await page.getByRole('heading', { name: '전체 로밍 상품', exact: true }).waitFor()
    assert.equal(await input.inputValue(), '')
    assert.equal(
      await countries
        .getByRole('button', { name: '전체 국가', exact: true })
        .getAttribute('aria-pressed'),
      'true',
    )
    assert.deepEqual(calls.at(-1), { keyword: null, country: null })
  })
})

test('기존 대화를 열고 새 AI 질문의 최종 응답 이후 폴링을 중단한다', async () => {
  await withPage('USER', async ({ page, fixtures, goto }) => {
    await goto('/ai')
    await page.getByTitle('저장된 대화', { exact: true }).click()
    await page.getByText('기존 답변', { exact: true }).waitFor()
    await page.getByRole('textbox', { name: 'AI 채팅 입력' }).fill('새 질문입니다')
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
    await page.getByTitle('저장된 대화', { exact: true }).waitFor()
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
        paths: ['store', 'stores', 'ai'].map(routes.userPagePath),
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
    assert.deepEqual(result.routes, ['store', 'notices', 'stores', 'store', 'ai'])
    assert.deepEqual(result.paths, ['/store', '/stores', '/'])
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
