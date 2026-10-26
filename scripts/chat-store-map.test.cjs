const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const { startServer, launchBrowser } = require('./test-support/browser.cjs')
const { installFixtures } = require('./test-support/fixtures.cjs')
const { installKakaoFixture, installGeolocationFixture } = require('./test-support/kakao.cjs')
let server, browser
before(async () => {
  server = await startServer(path.resolve(__dirname, '..'), 4195)
  browser = await launchBrowser()
})
after(async () => {
  await browser?.close()
  server?.close()
})
const store = {
  storeId: 21,
  storeName: '역삼 검증 매장',
  sido: '서울',
  sigungu: '강남구',
  address: '서울 강남구 테헤란로 123 1층 고객 상담센터',
  phoneNumber: '02-1234-5678',
  businessHours: '평일 09:00~19:00',
  latitude: 37.5,
  longitude: 127,
  distanceKm: 0.1,
}
const resultMap = {
  center: { latitude: 37.5, longitude: 127 },
  placeName: null,
  radiusKm: 3,
  stores: [store],
}
const ok = (route, data) => route.fulfill({ json: { success: true, data } })

async function scenario({ nearby = true, floating = false } = {}, run) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    reducedMotion: 'reduce',
  })
  const fixtures = await installFixtures(context, 'USER')
  await installKakaoFixture(context)
  await installGeolocationFixture(context)
  const submissions = [],
    researches = []
  await context.route('**/api/stores/regions/sidos', (route) => ok(route, ['서울']))
  await context.route('**/api/stores/21', (route) => ok(route, store))
  await context.route('**/api/chat/questions', (route) => {
    submissions.push(route.request().postDataJSON())
    return ok(route, {
      jobId: submissions.length,
      status: 'QUEUED',
      conversationId: 'store-conversation',
      idempotencyKey: 'store-key',
      attemptCount: 1,
    })
  })
  await context.route('**/api/chat/questions/research', (route) => {
    researches.push(route.request().postDataJSON())
    return ok(route, {
      jobId: 99,
      status: 'QUEUED',
      idempotencyKey: 'research-key',
      attemptCount: 1,
    })
  })
  await context.route('**/api/chat/jobs/*', (route) => {
    const id = Number(new URL(route.request().url()).pathname.split('/').pop())
    const body = submissions[id - 1]
    return ok(route, {
      jobId: id,
      status: 'SUCCEEDED',
      answer: '매장 검색 결과입니다.',
      store:
        nearby && !body?.useMyLocation
          ? { locationRequired: true, map: null }
          : { locationRequired: false, map: resultMap },
      idempotencyKey: 'store-key',
      attemptCount: 1,
      retryable: false,
    })
  })
  const page = await context.newPage(),
    errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.setDefaultTimeout(12000)
  try {
    await page.goto(server.origin + '/#/ai')
    if (floating) await page.getByRole('button', { name: 'Ubot 챗봇 열기', exact: true }).click()
    const scope = floating
      ? page.getByRole('dialog', { name: 'Ubot 채팅', exact: true })
      : page.locator('.ai-app')
    const input = scope.getByRole('textbox', { name: 'AI 채팅 입력', exact: true })
    await input.fill('가까운 매장 찾아줘')
    await scope.getByRole('button', { name: '질문 보내기', exact: true }).click()
    await run({ context, page, scope, input, submissions, researches, fixtures })
    assert.deepEqual(errors, [])
    assert.deepEqual(fixtures.unknown, [])
  } finally {
    await context.close()
  }
}
async function grant(page) {
  await page.evaluate(() =>
    window.__geoRequests.shift().success({ coords: { latitude: 37.5, longitude: 127 } }),
  )
}
async function deny(page) {
  await page.evaluate(() => window.__geoRequests.shift().error({ code: 1 }))
}

test('위치 필요 응답은 권한 확인을 먼저 기다리고 허용 좌표로 매장 검색을 이어간다', async () => {
  await scenario({}, async ({ page, scope, submissions }) => {
    await scope
      .getByText('주변 매장을 찾기 위해 위치 허용을 기다리고 있습니다.', { exact: true })
      .waitFor()
    assert.equal(submissions.length, 1)
    assert.equal(await page.evaluate(() => window.__geoCalls), 1)
    await grant(page)
    await scope.getByRole('heading', { name: store.storeName, exact: true }).waitFor()
    assert.deepEqual(submissions[1], {
      question: '가까운 매장 찾아줘',
      conversationId: 'store-conversation',
      latitude: 37.5,
      longitude: 127,
      useMyLocation: true,
    })
    assert.equal(await page.locator('.chat-map-drawer').count(), 0)
    assert.equal(await scope.locator('.chat-inline-map').count(), 0)
    await scope.getByRole('button', { name: '지도에서 보기', exact: true }).click()
    await scope.locator('.chat-inline-map-canvas[data-map-ready="true"]').waitFor()
    assert((await scope.locator('.chat-thread .chat-inline-map').count()) === 1)
    assert(
      (await page.evaluate(() => window.__markerImages)).some((source) =>
        decodeURIComponent(source).includes('#E85D99'),
      ),
    )
    if (process.env.STORE_VISUAL_DIR)
      await scope.screenshot({
        path: path.join(process.env.STORE_VISUAL_DIR, 'inline-chat-map-desktop.png'),
      })
    await scope.getByRole('link', { name: '통합 지도', exact: true }).click()
    await page.waitForURL('**/#/stores?storeId=21')
    await page.locator('#storeListItems [data-store-id="21"].active').waitFor()
    assert.equal(await page.locator('#storeSearchInput').inputValue(), store.storeName)
  })
})

test('위치 거절 시 좌표 없는 매장 검색을 진행하지 않고 허용 버튼으로 다시 시도한다', async () => {
  await scenario({}, async ({ page, scope, submissions }) => {
    await page.waitForFunction(() => window.__geoCalls === 1)
    await deny(page)
    const button = scope.getByRole('button', { name: '위치 허용하고 매장 찾기', exact: true })
    await button.waitFor()
    assert.equal(submissions.length, 1)
    await button.click()
    await page.waitForFunction(() => window.__geoCalls === 2)
    assert.equal(submissions.length, 1)
    await grant(page)
    await scope.getByRole('heading', { name: store.storeName, exact: true }).waitFor()
    assert.equal(submissions.length, 2)
  })
})

test('위치 허용 대기 중 중단하면 늦은 좌표로 검색을 다시 접수하지 않는다', async () => {
  await scenario({}, async ({ page, scope, submissions }) => {
    await page.waitForFunction(() => window.__geoCalls === 1)
    await scope.getByRole('button', { name: '답변 생성 중단', exact: true }).click()
    await scope.getByText('답변 생성을 중단했습니다.', { exact: true }).waitFor()
    await grant(page)
    assert.equal(submissions.length, 1)
    assert.equal(await scope.getByRole('button', { name: '지도에서 보기', exact: true }).count(), 0)
  })
})

test('위치가 정해진 답변은 권한을 묻지 않고 작은 채팅창 안에 지도를 표시한다', async () => {
  await scenario({ nearby: false, floating: true }, async ({ page, scope }) => {
    await scope.getByRole('heading', { name: store.storeName, exact: true }).waitFor()
    assert.equal(await page.evaluate(() => window.__geoCalls), 0)
    assert.equal((await scope.boundingBox()).width, 520)
    await scope.getByRole('button', { name: '지도에서 보기', exact: true }).click()
    await scope.locator('.chat-inline-map-canvas[data-map-ready="true"]').waitFor()
    await page.setViewportSize({ width: 390, height: 844 })
    const overflow = await scope.evaluate((node) => ({
      panel: node.scrollWidth > node.clientWidth,
      thread:
        node.querySelector('.chat-thread').scrollWidth >
        node.querySelector('.chat-thread').clientWidth,
    }))
    assert.deepEqual(overflow, { panel: false, thread: false })
    if (process.env.STORE_VISUAL_DIR)
      await page.screenshot({
        path: path.join(process.env.STORE_VISUAL_DIR, 'inline-chat-map-mobile.png'),
      })
    await scope.getByRole('link', { name: '통합 지도', exact: true }).click()
    await page.waitForURL('**/#/stores?storeId=21')
    await scope.waitFor({ state: 'hidden' })
    await page.locator('#storeListItems [data-store-id="21"].active').waitFor()
    await page.evaluate(() => history.replaceState(null, '', location.href))
    await page.reload()
    await page.locator('#storeListItems [data-store-id="21"].active').waitFor()
  })
})

test('매장 의도 재검색도 위치 거절 시 서버 조회를 진행하지 않는다', async () => {
  await scenario({ nearby: false }, async ({ page, scope, researches }) => {
    await scope.getByRole('heading', { name: store.storeName, exact: true }).waitFor()
    await scope.getByRole('button', { name: '질문 의도 변경', exact: true }).click()
    await scope
      .getByRole('group', { name: '질문 의도 선택' })
      .getByRole('button', { name: '매장 찾기', exact: true })
      .click()
    await page.waitForFunction(() => window.__geoCalls === 1)
    await deny(page)
    await scope
      .getByText('위치 권한을 허용하거나 지역명을 포함해 다시 질문해 주세요.', { exact: true })
      .waitFor()
    assert.equal(researches.length, 0)
  })
})
