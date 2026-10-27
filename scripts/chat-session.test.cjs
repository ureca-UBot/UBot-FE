const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const { startServer, launchBrowser } = require('./test-support/browser.cjs')
const { installProductChat, products, ok } = require('./test-support/chat-products.cjs')
const { pageOf } = require('./test-support/fixtures.cjs')
const { installKakaoFixture } = require('./test-support/kakao.cjs')
let server, browser
before(async () => {
  server = await startServer(path.resolve(__dirname, '..'), 4212)
  browser = await launchBrowser()
})
after(async () => {
  await browser?.close()
  server?.close()
})

async function scenario(config, run) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    reducedMotion: 'reduce',
  })
  const state = await installProductChat(context, config)
  await installKakaoFixture(context)
  const page = await context.newPage(),
    errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.setDefaultTimeout(12000)
  try {
    await page.goto(server.origin + '/#/ai')
    await run({ page, context, main: page.locator('.ai-app'), ...state })
    assert.deepEqual(errors, [])
    assert.deepEqual(state.fixtures.unknown, [])
  } finally {
    await context.close()
  }
}
async function ask(scope, text = '나에게 맞는 상품을 찾아줘') {
  await scope.getByRole('textbox', { name: 'AI 채팅 입력', exact: true }).fill(text)
  await scope.getByRole('button', { name: '질문 보내기', exact: true }).click()
}
async function openFloating(page) {
  await page.getByRole('button', { name: 'Ubot 챗봇 열기', exact: true }).click()
  return page.getByRole('dialog', { name: 'Ubot 채팅', exact: true })
}
async function choose(scope, text) {
  await scope.locator('.pd-filter-options').getByRole('button', { name: text, exact: true }).click()
}
async function finish(scope) {
  for (const text of ['5G', '일반', '5만원 이하', '무제한만', '월정액 낮은 순'])
    await choose(scope, text)
  await scope.getByRole('region', { name: '상품 목록', exact: true }).waitFor()
}

for (const role of [null, 'USER'])
  test(`작은 창의 필터 결과를 본 창과 공유하고 새로고침 후 재조회 없이 복원한다 (${role ?? 'GUEST'})`, async () => {
    await scenario({ role }, async ({ page, main, requests }) => {
      const floating = await openFloating(page)
      await ask(floating)
      await finish(floating)
      await main.getByRole('region', { name: '상품 목록', exact: true }).waitFor()
      assert.equal(await main.locator('.pd-card').count(), 2)
      assert.equal(requests.searches.length, 1)
      assert.equal(requests.questions.length, 1)
      if (role === 'USER') await page.setViewportSize({ width: 390, height: 900 })
      await page.reload()
      await main.getByRole('region', { name: '상품 목록', exact: true }).waitFor()
      assert.equal(await main.locator('.pd-chosen button').count(), 5)
      assert.equal(await main.locator('.pd-card').count(), 2)
      assert.equal(requests.searches.length, 1)
      assert.equal(requests.questions.length, 1)
      if (role === 'USER') await page.setViewportSize({ width: 1440, height: 1100 })
      const reopened = await openFloating(page)
      assert.equal(await reopened.locator('.pd-card').count(), 2)
      await reopened.getByRole('button', { name: '채팅창 닫기', exact: true }).click()
      await main.getByRole('button', { name: '네트워크: 5G 변경', exact: true }).click()
      assert.equal(await main.locator('.pd-card').count(), 0)
      const afterEdit = await openFloating(page)
      assert.equal(await afterEdit.locator('.pd-card').count(), 0)
      await choose(afterEdit, 'LTE')
      await afterEdit.getByRole('button', { name: '네트워크: LTE 변경', exact: true }).waitFor()
      await main.getByRole('button', { name: '네트워크: LTE 변경', exact: true }).waitFor()
    })
  })

test('선택 도중의 조건도 새로고침 뒤 유지되고 새 질문 ID가 기존 답변과 충돌하지 않는다', async () => {
  await scenario({}, async ({ page, main, requests }) => {
    await ask(main)
    await choose(main, '5G')
    await choose(main, '일반')
    await page.reload()
    await main.getByRole('button', { name: '대상: 일반 변경', exact: true }).waitFor()
    assert.equal(await main.locator('.pd-chosen button').count(), 2)
    await choose(main, '5만원 이하')
    await choose(main, '무제한만')
    await choose(main, '월정액 낮은 순')
    await main.locator('.pd-list').waitFor()
    await ask(main, '두 번째 상품 질문')
    await main.getByText('두 번째 상품 질문', { exact: true }).waitFor()
    await main.locator('.pd-refine').nth(1).waitFor()
    assert.equal(await main.locator('.pd-refine').count(), 2)
    assert.equal(await main.locator('.pd-list').count(), 1)
    assert.equal(requests.questions.length, 2)
  })
})

const store = {
  storeId: 21,
  storeName: '복원 검증 매장',
  sido: '서울',
  sigungu: '강남구',
  address: '서울 강남구 테헤란로 123',
  phoneNumber: '02-1234-5678',
  businessHours: '평일 09:00~19:00',
  latitude: 37.5,
  longitude: 127,
  distanceKm: 0.1,
}
const storeResult = {
  locationRequired: false,
  map: {
    center: { latitude: 37.5, longitude: 127 },
    placeName: null,
    radiusKm: 3,
    stores: [store],
  },
}
test('매장 카드와 펼친 지도는 두 창에서 공유하고 새로고침 후에도 유지한다', async () => {
  await scenario(
    { data: { products: [], refine: null }, responseFields: { store: storeResult } },
    async ({ page, main, requests }) => {
      const floating = await openFloating(page)
      await ask(floating, '강남 매장 찾아줘')
      await floating.getByRole('button', { name: '지도에서 보기', exact: true }).click()
      await floating.locator('.chat-inline-map').waitFor()
      await main.locator('.chat-inline-map').waitFor()
      await page.reload()
      await main.getByRole('heading', { name: store.storeName, exact: true }).waitFor()
      await main.locator('.chat-inline-map').waitFor()
      assert.equal(requests.questions.length, 1)
      await main.getByRole('button', { name: '지도 접기', exact: true }).click()
      const reopened = await openFloating(page)
      assert.equal(await reopened.locator('.chat-inline-map').count(), 0)
      assert.equal(
        await reopened.getByRole('button', { name: '지도에서 보기', exact: true }).count(),
        1,
      )
    },
  )
})

test('문장만 내려오는 대화 이력을 다시 열어도 같은 대화의 필터 결과를 복원한다', async () => {
  await scenario(
    { conversationId: 'saved-conversation' },
    async ({ page, context, main, requests }) => {
      await context.route('**/api/conversations/me?**', (route) =>
        ok(
          route,
          pageOf([
            {
              conversationId: 'saved-conversation',
              title: '상품 이력 복원',
              lastQuestionAt: '2026-10-27T12:00:00',
            },
            {
              conversationId: 'other-conversation',
              title: '다른 대화',
              lastQuestionAt: '2026-10-27T11:00:00',
            },
          ]),
        ),
      )
      await context.route('**/api/conversations/*/messages', (route) =>
        ok(route, [
          {
            id: 1,
            question: '나에게 맞는 상품을 찾아줘',
            answer: '필요한 상품 조건을 선택해 주세요.',
            createdAt: '2026-10-27T12:00:00',
          },
        ]),
      )
      await ask(main)
      await finish(main)
      await main.getByRole('button', { name: '＋ 새 대화', exact: true }).click()
      assert.equal(await main.locator('.pd-card').count(), 0)
      await main
        .getByRole('button', { name: /상품 이력 복원/ })
        .first()
        .click()
      await main.locator('.pd-list').waitFor()
      assert.equal(await main.locator('.pd-card').count(), 2)
      assert.equal(requests.searches.length, 1)
      await main
        .getByRole('button', { name: /다른 대화/ })
        .first()
        .click()
      await main.locator('.pd-list').waitFor({ state: 'detached' })
      await main.getByText('필요한 상품 조건을 선택해 주세요.', { exact: true }).waitFor()
      assert.equal(await main.locator('.pd-card').count(), 0)
    },
  )
})

test('로그아웃하면 저장된 카드도 제거해 다시 로그인해도 이전 대화를 자동 노출하지 않는다', async () => {
  await scenario({ data: { products, refine: null } }, async ({ page, main }) => {
    await ask(main)
    await main.locator('.pd-list').waitFor()
    await page.getByRole('button', { name: '로그아웃', exact: true }).click()
    await main.getByRole('heading', { name: '무엇을 찾고 계세요?', exact: true }).waitFor()
    assert.equal(
      await page.evaluate(() => sessionStorage.getItem('ubot:chat-session:v1:user:1')),
      null,
    )
    await page.reload()
    assert.equal(await main.locator('.pd-card').count(), 0)
  })
})

test('저장소가 차단돼도 두 창의 필터 공유는 메모리에서 정상 동작한다', async () => {
  await scenario({}, async ({ page, context, main }) => {
    await context.addInitScript(() => {
      const original = Storage.prototype.setItem
      Storage.prototype.setItem = function (key, value) {
        if (key.startsWith('ubot:chat-session:')) throw new Error('storage blocked')
        return original.call(this, key, value)
      }
    })
    await page.reload()
    await ask(main)
    await finish(main)
    const floating = await openFloating(page)
    assert.equal(await floating.locator('.pd-card').count(), 2)
  })
})

test('생성 중 새로고침해도 자동 재전송하거나 입력을 계속 잠그지 않는다', async () => {
  await scenario(
    {
      conversationId: 'pending-conversation',
      responseFields: { status: 'RUNNING', answer: null, productData: null },
    },
    async ({ page, context, main, requests }) => {
      await context.route('**/api/conversations/me?**', (route) =>
        ok(
          route,
          pageOf([
            {
              conversationId: 'pending-conversation',
              title: '처리 결과 확인',
              lastQuestionAt: '2026-10-27T12:00:00',
            },
          ]),
        ),
      )
      await context.route('**/api/conversations/pending-conversation/messages', (route) =>
        ok(route, [
          {
            id: 1,
            question: '나에게 맞는 상품을 찾아줘',
            answer: '새로고침 중 완료된 답변',
            createdAt: '2026-10-27T12:00:00',
          },
        ]),
      )
      await ask(main)
      await main.getByRole('button', { name: '답변 생성 중단', exact: true }).waitFor()
      await page.reload()
      await main
        .getByText('새로고침으로 답변 확인이 중단됐습니다. 대화 기록에서 결과를 확인해 주세요.', {
          exact: true,
        })
        .waitFor()
      assert.equal(
        await main.getByRole('textbox', { name: 'AI 채팅 입력', exact: true }).isEnabled(),
        true,
      )
      assert.equal(requests.questions.length, 1)
      await main
        .getByRole('button', { name: /처리 결과 확인/ })
        .first()
        .click()
      await main.getByText('새로고침 중 완료된 답변', { exact: true }).waitFor()
      assert.equal(requests.questions.length, 1)
    },
  )
})

test('재검색 상품 결과는 원래 답변의 필터와 분리하고 두 창·새로고침에서 유지한다', async () => {
  await scenario({}, async ({ page, context, main, requests }) => {
    let researches = 0
    await context.route('**/api/chat/questions/research', (route) => {
      researches++
      return ok(route, {
        jobId: 99,
        status: 'QUEUED',
        idempotencyKey: 'research-view',
        attemptCount: 1,
      })
    })
    await ask(main)
    await choose(main, '5G')
    await main
      .getByRole('button', { name: '질문에 맞는 의도를 선택하면 다시 찾아드려요.', exact: true })
      .click()
    await main
      .getByRole('group', { name: '질문 의도 선택', exact: true })
      .getByRole('button', { name: '상품 정보', exact: true })
      .click()
    const research = main.locator('.research-result')
    await research.locator('.pd-refine').waitFor()
    await finish(research)
    assert.equal(await main.locator('.pd-refine').first().locator('.pd-chosen button').count(), 1)
    const floating = await openFloating(page)
    await floating.locator('.research-result .pd-list').waitFor()
    await page.reload()
    await main.locator('.research-result .pd-list').waitFor()
    assert.equal(await main.locator('.pd-refine').first().locator('.pd-chosen button').count(), 1)
    assert.equal(researches, 1)
    assert.equal(requests.questions.length, 1)
    assert.equal(requests.searches.length, 1)
  })
})

test('사용량·청구서의 회선별 선택 월도 두 채팅창과 새로고침에서 유지한다', async () => {
  const months = ['2026-08', '2026-09', '2026-10']
  const userData = {
    plans: [],
    usages: months.map((billingMonth, index) => ({
      phoneNumber: '010-****-1234',
      usage: {
        billingMonth,
        dataUsedMb: (index + 1) * 1024,
        voiceUsedMinutes: 10,
        smsUsedCount: 5,
        allowance: null,
        remainingDataMb: null,
        remainingVoiceMinutes: null,
        remainingSmsCount: null,
        aggregatedThroughDate: null,
        finalized: true,
        finalizedAt: null,
        fullMonthActive: true,
      },
    })),
    billings: months.map((billingMonth, index) => ({
      phoneNumber: '010-****-1234',
      usageMonth: index + 7,
      billing: {
        billingMonth,
        baseFee: (index + 1) * 10000,
        addonFee: 0,
        roamingFee: 0,
        extraFee: 0,
        discountAmount: 0,
        totalAmount: (index + 1) * 10000,
        dueDate: null,
        paymentStatus: 'PAID',
        paidAmount: (index + 1) * 10000,
        paymentMethod: 'CARD',
        paidAt: null,
      },
    })),
  }
  await scenario(
    { data: { products: [], refine: null }, responseFields: { userData } },
    async ({ page, main }) => {
      const floating = await openFloating(page)
      await ask(floating, '올해 사용량과 청구서를 보여줘')
      await floating.getByRole('button', { name: /2026년 8월 사용량/ }).click()
      await floating.getByRole('button', { name: /2026년 9월 청구서/ }).click()
      for (const scope of [floating, main]) {
        assert.equal(
          await scope
            .getByRole('button', { name: /2026년 8월 사용량/ })
            .getAttribute('aria-pressed'),
          'true',
        )
        assert.equal(
          await scope
            .getByRole('button', { name: /2026년 9월 청구서/ })
            .getAttribute('aria-pressed'),
          'true',
        )
      }
      await page.reload()
      await main.getByRole('button', { name: /2026년 8월 사용량/ }).waitFor()
      assert.equal(
        await main.getByRole('button', { name: /2026년 8월 사용량/ }).getAttribute('aria-pressed'),
        'true',
      )
      assert.equal(
        await main.getByRole('button', { name: /2026년 9월 청구서/ }).getAttribute('aria-pressed'),
        'true',
      )
    },
  )
})
