const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const fs = require('node:fs/promises')
const { startServer, launchBrowser } = require('./test-support/browser.cjs')
const { installFixtures } = require('./test-support/fixtures.cjs')
let server, browser
before(async () => {
  server = await startServer(path.resolve(__dirname, '..'), 4208)
  browser = await launchBrowser()
})
after(async () => {
  await browser?.close()
  server?.close()
})

async function workspace(
  active,
  run,
  { history, historyError = false, messagesError = false } = {},
) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
  })
  const fixtures = await installFixtures(context, 'COUNSELOR')
  const state = {
    available: false,
    session: active
      ? {
          sessionId: 'counsel-test',
          status: 'ACTIVE',
          assignmentVersion: 1,
          lastDeliveredSeq: 0,
          conversationId: 'conversation-test',
          handoffId: null,
        }
      : null,
    sent: [],
    customer: {
      name: '연결 고객',
      lines: [
        {
          subscriptionId: 7,
          phoneNumber: '010-1234-5678',
          status: 'ACTIVE',
          planName: '이용 중인 요금제',
          addons: ['데이터 부가서비스'],
          bundles: ['가족 결합'],
          roamings: [],
        },
      ],
      homeProducts: [{ subscriptionId: 3, productType: 'INTERNET', name: '인터넷 500M' }],
    },
  }
  await context.route('**/api/counsel/**', async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      pathname = url.pathname
    let data
    if (pathname.endsWith('/availability')) {
      state.available = request.postDataJSON().status === 'AVAILABLE'
      data = { status: state.available ? 'AVAILABLE' : 'OFFLINE' }
    } else if (pathname.endsWith('/heartbeat'))
      data = { status: state.available ? 'AVAILABLE' : 'OFFLINE' }
    else if (pathname.endsWith('/current')) data = state.session
    else if (pathname.endsWith('/customer')) data = state.customer
    else if (pathname.endsWith('/end')) {
      state.session.status = 'ENDED'
      data = state.session
    } else if (pathname.endsWith('/context')) {
      if (historyError)
        return route.fulfill({
          status: 503,
          json: { success: false, message: '이전 대화 조회 오류' },
        })
      data = history ?? [
        { sequence: 1, role: 'USER', content: '요금제를 바꾸고 싶어요.', source: 'SAVED' },
      ]
    } else if (pathname.endsWith('/messages')) {
      if (request.method() === 'POST') {
        const body = request.postDataJSON()
        state.sent.push(body)
        data = {
          messageId: 1,
          clientMessageId: body.clientMessageId,
          status: 'ALLOWED',
          deliverySequence: 1,
        }
      } else {
        if (messagesError)
          return route.fulfill({
            status: 503,
            json: { success: false, message: '상담 메시지 조회 오류' },
          })
        data = []
      }
    } else throw Error('Unexpected counsel request: ' + pathname)
    return route.fulfill({ json: { success: true, data } })
  })
  const page = await context.newPage(),
    errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.setDefaultTimeout(8000)
  try {
    await page.goto(server.origin + '/#/counselor')
    await page.getByRole('heading', { name: '상담사 업무 공간', exact: true }).waitFor()
    await run({ page, state })
    assert.deepEqual(errors, [])
    assert.deepEqual(fixtures.unknown, [])
  } finally {
    await context.close()
  }
}

test('상담사 화면에서 배정 대기를 켜고 끄며 홈·로그아웃 이미지 메뉴를 사용할 수 있다', async () => {
  await workspace(false, async ({ page, state }) => {
    await page.getByRole('heading', { name: '배정된 상담이 없습니다', exact: true }).waitFor()
    await page.getByRole('button', { name: '상담 가능으로 전환', exact: true }).click()
    assert.ok(state.available)
    await page.getByText('새 상담이 배정되면 이곳에 표시됩니다.', { exact: true }).waitFor()
    assert.equal(
      await page.getByRole('link', { name: '홈으로', exact: true }).locator('img').count(),
      1,
    )
    assert.equal(
      await page.getByRole('button', { name: '로그아웃', exact: true }).locator('img').count(),
      1,
    )
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 })
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
      if (process.env.TEST_REVIEW_DIR) {
        await fs.mkdir(process.env.TEST_REVIEW_DIR, { recursive: true })
        await page.screenshot({
          path: path.join(process.env.TEST_REVIEW_DIR, `counsel-empty-${width}.png`),
          fullPage: true,
        })
      }
    }
    await page.getByRole('button', { name: '오프라인으로 전환', exact: true }).click()
    assert.equal(state.available, false)
    await page.getByRole('button', { name: '로그아웃', exact: true }).click()
    await page.waitForURL('**/#/auth/login')
  })
})

test('상담사가 기존 대화를 확인하고 메시지를 전송한 다음 상담을 종료할 수 있다', async () => {
  await workspace(true, async ({ page, state }) => {
    const customer = page.getByRole('complementary', { name: '연결된 고객' })
    for (const text of [
      '연결 고객',
      '010-1234-5678',
      '이용 중인 요금제',
      '데이터 부가서비스',
      '가족 결합',
      '인터넷 500M',
    ])
      await customer.getByText(text, { exact: true }).waitFor()
    state.customer.lines[0].planName = '변경한 요금제'
    await customer.getByRole('button', { name: '정보 새로고침', exact: true }).click()
    await customer.getByText('변경한 요금제', { exact: true }).waitFor()
    await page.getByText('요금제를 바꾸고 싶어요.', { exact: true }).waitFor()
    assert.equal(await page.getByText('전달된 메시지가 없습니다.', { exact: true }).count(), 0)
    await page
      .getByRole('textbox', { name: '메시지', exact: false })
      .fill('요금제 변경을 도와드리겠습니다.')
    const send = page.getByRole('button', { name: '메시지 전송', exact: true })
    assert.equal(
      await send.evaluate((element) => getComputedStyle(element).backgroundColor),
      'rgb(247, 37, 133)',
    )
    await send.click()
    await page.getByText('전송 완료', { exact: true }).waitFor()
    assert.equal(state.sent[0].content, '요금제 변경을 도와드리겠습니다.')
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 })
      if (process.env.TEST_REVIEW_DIR)
        await page.screenshot({
          path: path.join(process.env.TEST_REVIEW_DIR, `counsel-active-${width}.png`),
          fullPage: true,
        })
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
    }
    await page.getByRole('button', { name: '상담 종료', exact: true }).click()
    assert.equal(state.session.status, 'ENDED')
    await page.getByPlaceholder('상담이 종료되었습니다.', { exact: true }).waitFor()
    assert.ok(await page.getByRole('textbox', { name: '메시지', exact: false }).isDisabled())
    // 종료된 상담은 고객 정보를 보여 주지 않습니다.
    await customer.waitFor({ state: 'detached' })
  })
})

test('이전 대화와 새 메시지가 모두 없는 상담에만 중앙 빈 안내를 표시한다', async () => {
  await workspace(
    true,
    async ({ page }) => {
      const empty = page.getByText('전달된 메시지가 없습니다.', { exact: true })
      await empty.waitFor()
      const box = await empty.boundingBox()
      const list = await page.locator('.counsel-messages').boundingBox()
      assert.ok(Math.abs(box.x + box.width / 2 - list.x - list.width / 2) < 1)
      assert.ok(Math.abs(box.y + box.height / 2 - list.y - list.height / 2) < 1)
    },
    { history: [] },
  )
})

for (const kind of ['history', 'messages']) {
  test(`${kind} 조회 실패를 메시지가 없는 상담으로 표시하지 않는다`, async () => {
    await workspace(
      true,
      async ({ page }) => {
        await page
          .getByRole('alert')
          .filter({ hasText: kind === 'history' ? '이전 대화 조회 오류' : '상담 메시지 조회 오류' })
          .waitFor()
        assert.equal(await page.getByText('전달된 메시지가 없습니다.', { exact: true }).count(), 0)
      },
      { history: [], historyError: kind === 'history', messagesError: kind === 'messages' },
    )
  })
}
