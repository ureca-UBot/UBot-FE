const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const fs = require('node:fs/promises')
const { startServer, launchBrowser } = require('./test-support/browser.cjs')
const { installFixtures, pageOf } = require('./test-support/fixtures.cjs')
let server, browser
const stamp = '2026-10-26T10:30:00'
const sample = () =>
  Array.from({ length: 14 }, (_, index) => ({
    alertId: index + 1,
    region: index < 3 ? 'SEOUL' : index < 8 ? 'BUSAN' : 'GYEONGGI',
    subject:
      index < 2
        ? index
          ? ' 데이터  연결 '
          : '데이터 연결'
        : index > 11
          ? null
          : index % 2
            ? '요금 문의'
            : '통화 품질',
    questionCount: index + 1,
    windowMinutes: 10,
    status: index === 2 ? 'PROCESSED' : 'PENDING',
    processedById: index === 2 ? 99 : null,
    processedAt: index === 2 ? stamp : null,
    createdAt: stamp,
  }))

before(async () => {
  server = await startServer(path.resolve(__dirname, '..'), 4207)
  browser = await launchBrowser()
})
after(async () => {
  await browser?.close()
  server?.close()
})

async function withMap(run, { empty = false, failPage = -1, width = 1440 } = {}) {
  const context = await browser.newContext({
    viewport: { width, height: 1000 },
    reducedMotion: 'reduce',
  })
  const fixtures = await installFixtures(context, 'ADMIN')
  const data = empty ? [] : sample()
  const pages = [],
    processed = []
  const state = { failPage }
  await context.route('**/api/admin/telemap/alerts**', async (route) => {
    const url = new URL(route.request().url())
    if (url.searchParams.has('page')) {
      const index = Number(url.searchParams.get('page'))
      pages.push(index)
      if (index === state.failPage)
        return route.fulfill({ status: 503, json: { success: false, message: '목록 조회 실패' } })
      return route.fulfill({
        json: {
          success: true,
          data: {
            ...pageOf(data.slice(index * 5, index * 5 + 5)),
            totalPages: Math.ceil(data.length / 5),
            totalElements: data.length,
            last: index >= Math.ceil(data.length / 5) - 1,
          },
        },
      })
    }
    const id = Number(url.pathname.match(/alerts\/(\d+)/)?.[1])
    const alert = data.find((item) => item.alertId === id)
    if (!alert) return route.fulfill({ status: 404, json: { success: false } })
    if (route.request().method() === 'PATCH') {
      alert.status = 'PROCESSED'
      alert.processedAt = stamp
      alert.processedById = 99
      processed.push(id)
    }
    return route.fulfill({
      json: {
        success: true,
        data: {
          ...alert,
          questionSnapshots: [
            { questionLogId: id, question: `실제 질문 내용 ${id}`, occurredAt: stamp },
          ],
        },
      },
    })
  })
  const page = await context.newPage()
  page.setDefaultTimeout(8000)
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  try {
    await page.goto(server.origin + '/#/admin/telemap')
    await page.getByRole('button', { name: '새로고침', exact: true }).waitFor()
    await page.waitForFunction(
      () => !document.querySelector('.telemap-page__refresh button').disabled,
    )
    await run({ page, context, pages, processed, state, data })
    assert.deepEqual(errors, [])
    assert.deepEqual(fixtures.unknown, [])
  } finally {
    await context.close()
  }
}

test('전국 지도는 모든 API 페이지를 집계하고 같은 시·도·주제를 묶는다', async () => {
  await withMap(async ({ page, pages }) => {
    assert.ok([0, 1, 2].every((index) => pages.includes(index)))
    assert.equal(await page.locator('.telemap-map__province').count(), 17)
    assert.equal(await page.getByRole('heading', { name: '급증 질문 105건' }).count(), 1)
    assert.equal(
      await page
        .getByRole('button', { name: '서울 · 데이터 연결 · 질문 3건 상세 보기', exact: true })
        .count(),
      1,
    )
    await page.getByLabel('지역', { exact: true }).selectOption('GYEONGGI')
    // 주제가 아직 없는 두 알림을 같은 질문으로 잘못 묶지 않습니다.
    assert.equal(
      await page.locator('.telemap-cluster-row').filter({ hasText: '주제 생성 중' }).count(),
      2,
    )
    await page.getByRole('button', { name: '목록 보기', exact: true }).click()
    assert.equal(await page.locator('tbody tr').count(), 6)
    await page.getByRole('button', { name: '필터 초기화' }).click()
    assert.equal(await page.locator('tbody tr').count(), 10)
    await page.getByRole('button', { name: '2', exact: true }).click()
    assert.equal(await page.locator('tbody tr').count(), 4)
  })
})

test('지역·상태·질문 필터를 함께 적용하고 주제의 색을 유지한다', async () => {
  await withMap(async ({ page }) => {
    const marker = page.getByRole('button', {
      name: '서울 · 데이터 연결 · 질문 3건 상세 보기',
      exact: true,
    })
    const color = await marker.evaluate((el) => getComputedStyle(el).backgroundColor)
    const region = page.getByRole('button', { name: '서울 지역 선택', exact: true })
    await region.focus()
    await page.keyboard.press('Enter')
    assert.equal(await page.getByLabel('지역', { exact: true }).inputValue(), 'SEOUL')
    assert.equal(await page.getByRole('heading', { name: '급증 질문 6건' }).count(), 1)
    await page.getByLabel('상태', { exact: true }).selectOption('PENDING')
    await page.getByLabel('질문', { exact: true }).selectOption('데이터 연결')
    assert.equal(await page.getByRole('heading', { name: '급증 질문 3건' }).count(), 1)
    assert.equal(await marker.evaluate((el) => getComputedStyle(el).backgroundColor), color)
    await page.getByRole('button', { name: '필터 초기화' }).click()
    assert.equal(await page.getByRole('heading', { name: '급증 질문 105건' }).count(), 1)
  })
})

test('클러스터 마커에서 개별 감지 내역과 질문을 확인하고 처리 완료로 변경한다', async () => {
  await withMap(async ({ page, processed }) => {
    await page
      .getByRole('button', { name: '서울 · 데이터 연결 · 질문 3건 상세 보기', exact: true })
      .click()
    const modal = page.getByRole('dialog')
    await modal.getByText('실제 질문 내용 2', { exact: true }).waitFor()
    await modal.getByRole('combobox').selectOption('1')
    await modal.getByText('실제 질문 내용 1', { exact: true }).waitFor()
    await modal.getByRole('button', { name: '처리 완료', exact: true }).click()
    await modal.getByText('관리자 #99', { exact: false }).waitFor()
    assert.deepEqual(processed, [1])
    assert.equal(await modal.getByRole('button', { name: '처리 완료', exact: true }).count(), 0)
    await page.keyboard.press('Escape')
    assert.equal(await page.getByRole('dialog').count(), 0)
    await page.getByLabel('상태', { exact: true }).selectOption('PENDING')
    await page.getByRole('heading', { name: '급증 질문 101건' }).waitFor()
  })
})

test('중간 페이지 실패 시 부분 집계를 표시하지 않고 재조회로 복구한다', async () => {
  await withMap(
    async ({ page, state }) => {
      assert.equal(await page.locator('.telemap-map__marker').count(), 0)
      assert.equal(await page.getByRole('alert').filter({ hasText: '목록 조회 실패' }).count(), 1)
      state.failPage = -1
      await page.getByRole('button', { name: '다시 시도', exact: true }).click()
      await page.getByRole('heading', { name: '급증 질문 105건' }).waitFor()
    },
    { failPage: 1 },
  )
})

test('빈 데이터는 지도 윤곽과 0건 안내를 유지한다', async () => {
  await withMap(
    async ({ page }) => {
      assert.equal(await page.locator('.telemap-map__province').count(), 17)
      assert.equal(await page.getByRole('heading', { name: '급증 질문 0건' }).count(), 1)
      assert.equal(await page.locator('.telemap-map__marker').count(), 0)
      await page.getByText('조건에 맞는 급증 질문이 없습니다.', { exact: true }).waitFor()
    },
    { empty: true },
  )
})

test('지도와 모달이 데스크톱·태블릿·휴대폰 화면에서 페이지 밖으로 넘치지 않는다', async () => {
  await withMap(async ({ page }) => {
    for (const width of [1440, 1366, 768, 390, 320]) {
      await page.setViewportSize({ width, height: width < 600 ? 844 : 900 })
      assert.ok(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        `overflow ${width}`,
      )
      if (process.env.TEST_REVIEW_DIR) {
        await fs.mkdir(process.env.TEST_REVIEW_DIR, { recursive: true })
        await page
          .locator('.telemap-page')
          .screenshot({ path: path.join(process.env.TEST_REVIEW_DIR, `map-${width}.png`) })
      }
    }
    await page
      .getByRole('button', { name: '서울 · 데이터 연결 · 질문 3건 상세 보기', exact: true })
      .click()
    await page.getByRole('dialog').getByText('실제 질문 내용 2', { exact: true }).waitFor()
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
  })
})

test('상담사만 사용자 화면의 데스크톱·모바일 상담사 바로가기를 볼 수 있다', async () => {
  for (const role of ['COUNSELOR', 'ADMIN', 'USER', null]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    await installFixtures(context, role)
    await context.route('**/api/counsel/counselors/heartbeat', (route) =>
      route.fulfill({ json: { success: true, data: { status: 'OFFLINE' } } }),
    )
    const page = await context.newPage()
    try {
      await page.goto(server.origin + '/#/ai')
      await page.locator('.ubot-user-app').waitFor()
      if (role) await page.getByRole('button', { name: '로그아웃', exact: true }).first().waitFor()
      const link = page.locator('.desktop-header').getByRole('link', { name: '상담사 화면' })
      assert.equal(await link.count(), role === 'COUNSELOR' ? 1 : 0)
      if (role === 'COUNSELOR') {
        assert.equal(await link.getAttribute('href'), '#/counselor')
        assert.equal(await link.locator('img').count(), 1)
        await page.setViewportSize({ width: 390, height: 844 })
        assert.equal(
          await page
            .locator('.mobile-header')
            .getByRole('link', { name: '상담사 화면' })
            .isVisible(),
          true,
        )
        await page.locator('.mobile-header').getByRole('link', { name: '상담사 화면' }).click()
        await page.getByRole('heading', { name: '상담사 업무 공간', exact: true }).waitFor()
      }
    } finally {
      await context.close()
    }
  }
})
