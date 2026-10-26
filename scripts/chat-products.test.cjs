const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const fs = require('node:fs/promises')
const { startServer, launchBrowser } = require('./test-support/browser.cjs')
const { pageOf } = require('./test-support/fixtures.cjs')
const {
  refine,
  group,
  products,
  plan,
  ok,
  installProductChat,
} = require('./test-support/chat-products.cjs')
let server, browser
before(async () => {
  server = await startServer(path.resolve(__dirname, '..'), 4207)
  browser = await launchBrowser()
  await fs.mkdir('test-results/chat-products', { recursive: true })
})
after(async () => {
  await browser?.close()
  server?.close()
})

async function scenario(config, run) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
  })
  const state = await installProductChat(context, config)
  const page = await context.newPage(),
    errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.setDefaultTimeout(10000)
  try {
    await page.goto(server.origin + '/#/ai')
    if (config.floating)
      await page.getByRole('button', { name: 'Ubot 챗봇 열기', exact: true }).click()
    const scope = config.floating
      ? page.getByRole('dialog', { name: 'Ubot 채팅', exact: true })
      : page.locator('.ai-app')
    await scope
      .getByRole('textbox', { name: 'AI 채팅 입력', exact: true })
      .fill('나에게 맞는 상품을 찾아줘')
    await scope.getByRole('button', { name: '질문 보내기', exact: true }).click()
    await scope.locator('.chat-product-data').waitFor()
    await run({ page, context, scope, ...state })
    assert.deepEqual(errors, [])
    assert.deepEqual(state.fixtures.unknown, [])
  } catch (error) {
    await page.screenshot({
      path: `test-results/chat-products/failure-${config.floating ? 'floating' : 'main'}.png`,
    })
    throw error
  } finally {
    await context.close()
  }
}
async function choose(scope, label) {
  const button = scope
    .locator('.pd-filter-options')
    .getByRole('button', { name: label, exact: true })
  await button.waitFor({ state: 'visible' })
  await button.click()
}
async function finish(scope) {
  for (const label of ['5G', '일반', '5만원 이하', '무제한만', '월정액 낮은 순'])
    await choose(scope, label)
  await scope.getByRole('region', { name: '상품 목록', exact: true }).waitFor()
}

test('상품 조건을 순서대로 서버에서 확인하고 없는 조합을 막으며 완료 후 가로 요약 목록을 표시한다', async () => {
  await scenario({}, async ({ page, scope, requests }) => {
    await choose(scope, '5G')
    await scope.getByRole('button', { name: /청년.*상품 없음/ }).waitFor()
    assert.equal(await scope.getByRole('button', { name: /청년.*상품 없음/ }).isDisabled(), true)
    assert.equal(await scope.locator('.pd-list').count(), 0)
    assert.equal(requests.searches.length, 0)
    for (const name of ['일반', '5만원 이하', '무제한만', '월정액 낮은 순'])
      await choose(scope, name)
    await scope.getByText('조건에 맞는 상품 2개', { exact: true }).waitFor()
    assert.deepEqual(requests.searches, [
      {
        type: 'PLAN',
        keyword: null,
        conditions: {
          networkType: 'FIVE_G',
          targetGroup: 'GENERAL',
          maxMonthlyFee: '50000',
          data: 'UNLIMITED',
          sortBy: 'MONTHLY_FEE_ASC',
        },
      },
    ])
    assert.deepEqual(
      [...new Set(requests.options.map(({ key }) => key))],
      refine.groups.map(({ key }) => key),
    )
    for (const request of requests.options) {
      assert.equal(request.authorization, undefined)
      assert.equal(Object.hasOwn(request.conditions, request.key), false)
    }
    assert.equal(requests.questions.length, 1)
    const cards = await scope.locator('.pd-card').all()
    assert.equal(cards.length, 2)
    const first = await cards[0].boundingBox(),
      second = await cards[1].boundingBox()
    assert.ok(second.x >= first.x + first.width)
    assert.equal(second.y, first.y)
    assert.ok(first.height <= 270)
    assert.equal(first.width, second.width)
    await page.screenshot({ path: 'test-results/chat-products/results-1440.png' })
    await scope.getByRole('button', { name: '네트워크: 5G 변경', exact: true }).click()
    assert.equal(await scope.locator('.pd-list').count(), 0)
    await choose(scope, 'LTE')
    await choose(scope, '상관없음')
    assert.deepEqual(requests.options.at(-1).conditions, { networkType: 'LTE' })
    assert.equal(await scope.locator('.pd-chosen button').count(), 2)
  })
})

test('옵션·상품 조회 실패는 재시도하고 오래된 옵션 응답은 앞 조건 변경 후 적용하지 않는다', async () => {
  let failOptions = true,
    failSearch = true,
    releaseOld,
    notifyOld
  const oldStarted = new Promise((resolve) => {
    notifyOld = resolve
  })
  await scenario(
    {
      optionHandler: async (route, body) => {
        if (failOptions) {
          await route.fulfill({ status: 503, json: { success: false } })
          return true
        }
        if (body.key === 'targetGroup' && body.conditions.networkType === 'FIVE_G') {
          const oldRequest = new Promise((resolve) => {
            releaseOld = resolve
          })
          notifyOld()
          await oldRequest
          await ok(route, {
            key: 'targetGroup',
            anyAvailable: true,
            options: [{ value: 'GENERAL', available: true }],
          })
          return true
        }
      },
      searchHandler: async (route) => {
        if (failSearch) {
          await route.fulfill({ status: 503, json: { success: false } })
          return true
        }
      },
    },
    async ({ scope, page, requests }) => {
      await scope.getByText('상품 조건을 확인하지 못했습니다.', { exact: true }).waitFor()
      failOptions = false
      await scope.getByRole('button', { name: '다시 시도', exact: true }).click()
      await choose(scope, '5G')
      await page.waitForFunction(() =>
        document.querySelector('.pd-filter-step legend')?.textContent.includes('대상'),
      )
      // 앞 조건 변경은 진행 중에도 가능하며, 늦게 온 대상 응답으로 네트워크 단계가 덮이지 않습니다.
      await oldStarted
      await scope.getByRole('button', { name: '네트워크: 5G 변경', exact: true }).click()
      releaseOld()
      await choose(scope, 'LTE')
      for (const label of ['일반', '5만원 이하', '무제한만', '월정액 낮은 순'])
        await choose(scope, label)
      await scope.getByText('상품을 불러오지 못했습니다.', { exact: true }).waitFor()
      failSearch = false
      await scope.getByRole('button', { name: '다시 시도', exact: true }).click()
      await scope.locator('.pd-list').waitFor()
      const finalSearches = requests.searches.filter(
        (request) => request.conditions.networkType === 'LTE' && request.conditions.sortBy,
      )
      assert.equal(finalSearches.length, 2)
      assert.deepEqual(finalSearches[0], finalSearches[1])
      assert.equal(finalSearches[1].conditions.networkType, 'LTE')
    },
  )
})

test('0건 검색어를 제거해 다시 선택하고, 기본 목록에 없는 질문 조건도 DB 확인 후 표시한다', async () => {
  const data = {
    products: [],
    refine: {
      ...refine,
      keyword: '판매종료상품',
      groups: [
        {
          ...refine.groups[2],
          selected: '60000',
          options: [...refine.groups[2].options, { value: '60000', label: '6만원 이하' }],
        },
      ],
    },
  }
  await scenario(
    {
      data,
      optionHandler: async (route, body) => {
        if (body.keyword) {
          await ok(route, { key: body.key, anyAvailable: false, options: [] })
          return true
        }
        await ok(route, {
          key: body.key,
          anyAvailable: true,
          options: [
            { value: '50000', available: true },
            { value: '30000', available: false },
          ],
        })
        return true
      },
      searchHandler: async (route, body) => {
        if (body.keyword) {
          await ok(route, {
            answer: '조건에 맞는 상품이 없습니다.',
            productData: { products: [], refine: { ...data.refine, total: 0 } },
          })
          return true
        }
      },
    },
    async ({ scope, requests }) => {
      await scope.getByText(/현재 조건에 맞는 상품이 없습니다/).waitFor()
      await scope.getByRole('button', { name: '검색어 판매종료상품 제거', exact: true }).click()
      await choose(scope, '6만원 이하')
      await scope.locator('.pd-list').waitFor()
      assert.equal(requests.searches.at(-1).keyword, null)
      assert.deepEqual(requests.searches.at(-1).conditions, { maxMonthlyFee: '60000' })
    },
  )
})

for (const [type, groups, selections, expected] of [
  [
    'ADDON',
    [group('category', '분류', false, [['DATA_CHARGE', '데이터']])],
    ['데이터'],
    { category: 'DATA_CHARGE' },
  ],
  [
    'BUNDLE',
    [
      group('bundleType', '종류', true, [['FAMILY', '가족 결합']]),
      group('lineCount', '회선 수', true, [['2', '2회선']]),
    ],
    ['가족 결합', '2회선'],
    { bundleType: 'FAMILY', lineCount: '2' },
  ],
  ['ROAMING', [group('country', '나라', false, [['일본', '일본']])], ['일본'], { country: '일본' }],
])
  test(`${type}도 응답의 단계·선택지로 조회하며 비회원이 사용할 수 있다`, async () => {
    await scenario(
      {
        role: null,
        data: {
          products: [{ ...products[0], type }],
          refine: { type, keyword: null, total: 20, groups },
        },
      },
      async ({ scope, requests }) => {
        for (const selection of selections) {
          assert.equal(await scope.locator('.pd-card').count(), 0)
          assert.equal(requests.searches.length, 0)
          await choose(scope, selection)
        }
        await scope.locator('.pd-list').waitFor()
        assert.deepEqual(requests.searches.at(-1), { type, keyword: null, conditions: expected })
        assert.equal(await scope.getByRole('button', { name: '상관없음', exact: true }).count(), 0)
      },
    )
  })

for (const floating of [false, true])
  test(`상품 정보 이동은 정확한 상품 ID를 사용하고 가입 화면으로 연결한다 (${floating ? '작은 채팅창' : '전체 채팅창'})`, async () => {
    await scenario(
      {
        floating,
        data: { products, refine: null },
        catalogHandler: (route, url) => {
          if (url.searchParams.get('keyword') && url.searchParams.get('page') === '0')
            return ok(route, {
              ...pageOf([{ ...plan, planId: 99, name: '이름 일부만 같은 상품' }]),
              last: false,
            })
          return ok(route, pageOf([plan]))
        },
      },
      async ({ page, scope, requests }) => {
        const card = scope.getByRole('article', { name: products[0].name, exact: true })
        await card.getByRole('button', { name: '상품 가입 / 정보', exact: true }).click()
        await page.waitForURL('**/#/store?category=plans&productId=31')
        if (floating)
          assert.equal(
            await page.getByRole('dialog', { name: 'Ubot 채팅', exact: true }).count(),
            0,
          )
        const dialog = page.locator('.product-detail-dialog')
        await dialog.getByRole('heading', { name: products[0].name, exact: true }).waitFor()
        await dialog.getByRole('button', { name: '가입하기', exact: true }).click()
        await page.getByRole('heading', { name: '요금제 가입', exact: true }).waitFor()
        assert.deepEqual(
          requests.catalog.filter((item) => item.keyword).map((item) => item.page),
          ['0', '1'],
        )
        assert.equal(requests.searches.length, 0)
      },
    )
  })

test('390px·320px에서도 조건 버튼과 가로 결과가 채팅 영역 안에 들어간다', async () => {
  await scenario({}, async ({ page, scope }) => {
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 900 })
      if (width === 320)
        await scope.getByRole('button', { name: '조건 다시 선택', exact: true }).click()
      await scope.locator('.pd-filter-options button:enabled').first().waitFor()
      await scope.locator('.pd-refine').scrollIntoViewIfNeeded()
      await page.screenshot({ path: `test-results/chat-products/filters-${width}.png` })
      await finish(scope)
      const overflow = await scope
        .locator('.chat-product-data')
        .evaluate((root) => ({ width: root.clientWidth, scroll: root.scrollWidth }))
      assert.ok(overflow.scroll <= overflow.width + 1, JSON.stringify(overflow))
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        false,
      )
      await scope.locator('.pd-list').scrollIntoViewIfNeeded()
      await page.screenshot({ path: `test-results/chat-products/results-${width}.png` })
    }
  })
})

for (const supplied of [false, true])
  test(`첫 응답에 상품이 있어도 필터를 완료한 뒤에만 최대 5개를 표시한다 (${supplied ? '항목 포함 응답' : '안내 문장만 있는 응답'})`, async () => {
    const many = Array.from({ length: 8 }, (_, index) => ({
      ...products[index % 2],
      name: `검증 상품 ${index + 1}`,
    }))
    await scenario(
      {
        data: { products: supplied ? many : [], refine: { ...refine, total: 28 } },
        searchHandler: async (route) => {
          await ok(route, {
            answer: '조건을 선택해 주세요.',
            productData: { products: many, refine: { ...refine, total: 28 } },
          })
          return true
        },
      },
      async ({ page, scope, requests }) => {
        assert.equal(await scope.locator('.pd-card').count(), 0)
        assert.equal(requests.searches.length, 0)
        await finish(scope)
        assert.equal(await scope.locator('.pd-card').count(), 5)
        assert.ok((await scope.locator('.pd-result-count').textContent()).includes('5개 표시'))
        await page.screenshot({
          path: `test-results/chat-products/five-results-${supplied ? 'supplied' : 'fetched'}.png`,
        })
      },
    )
  })

test('필터 없는 응답도 5개까지만 표시하고 정확히 5개인 목록은 모두 유지한다', async () => {
  for (const count of [5, 8]) {
    const many = Array.from({ length: count }, (_, index) => ({
      ...products[0],
      name: `상품 ${index + 1}`,
    }))
    await scenario({ data: { products: many, refine: null } }, async ({ scope, requests }) => {
      assert.equal(await scope.locator('.pd-card').count(), 5)
      assert.equal(
        await scope.getByRole('button', { name: '상품 가입 / 정보', exact: true }).count(),
        5,
      )
      assert.equal(requests.searches.length, 0)
    })
  }
})

for (const floating of [false, true])
  test(`요약 상품은 한 줄 높이를 유지하며 화살표·키보드로 옆 상품을 볼 수 있다 (${floating ? '작은 채팅창' : '전체 채팅창'})`, async () => {
    const many = Array.from({ length: 5 }, (_, index) => ({
      ...products[0],
      name: `데이터 무제한 요금제와 다양한 혜택을 제공하는 상품 ${index + 1}`,
      specs: [
        '데이터 무제한 기본 제공으로 자유롭게 이용하세요.',
        '음성·문자 기본 제공과 데이터 공유를 지원합니다.',
      ],
      highlights: ['상세 화면에서 확인할 긴 이용 조건입니다.'.repeat(10)],
    }))
    await scenario(
      { floating, data: { products: many, refine: null } },
      async ({ page, scope }) => {
        for (const width of floating ? [1440] : [1440, 390, 320]) {
          await page.setViewportSize({ width, height: 1000 })
          const track = scope.getByRole('region', { name: '상품 목록', exact: true })
          const settleScroll = () =>
            track.evaluate(
              (node) =>
                new Promise((resolve) => {
                  let previous = node.scrollLeft,
                    stable = 0
                  const frame = () => {
                    stable = node.scrollLeft === previous ? stable + 1 : 0
                    previous = node.scrollLeft
                    if (stable >= 3) resolve()
                    else requestAnimationFrame(frame)
                  }
                  requestAnimationFrame(frame)
                }),
            )
          await track.scrollIntoViewIfNeeded()
          await track.evaluate((node) => {
            node.scrollLeft = 0
          })
          await settleScroll()
          const next = scope.getByRole('button', { name: '다음 상품', exact: true })
          await next.waitFor()
          const cards = await scope.locator('.pd-card').all(),
            boxes = await Promise.all(cards.map((card) => card.boundingBox()))
          assert.equal(boxes.length, 5)
          for (const box of boxes) {
            assert.equal(box.y, boxes[0].y)
            assert.ok(box.height <= 270, JSON.stringify(box))
          }
          const size = await track.evaluate((node) => ({
            visible: node.clientWidth,
            total: node.scrollWidth,
          }))
          assert.ok(size.total > size.visible)
          assert.equal(await scope.locator('.pd-highlights').count(), 0)
          await next.click()
          await settleScroll()
          assert.ok(await track.evaluate((node) => node.scrollLeft > 0))
          await track.evaluate((node) => {
            node.scrollLeft = 0
          })
          await track.focus()
          await track.press('ArrowRight')
          await settleScroll()
          assert.ok(await track.evaluate((node) => node.scrollLeft > 0))
          for (let index = 0; index < 8 && !(await next.isDisabled()); index++) {
            await next.click()
            await settleScroll()
          }
          assert.equal(await next.isDisabled(), true)
          await scope.getByRole('button', { name: '이전 상품', exact: true }).click()
          await settleScroll()
          assert.equal(await next.isDisabled(), false)
          assert.equal(
            await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
            false,
          )
          await page.screenshot({
            path: `test-results/chat-products/horizontal-${floating ? 'floating' : width}.png`,
          })
        }
      },
    )
  })
