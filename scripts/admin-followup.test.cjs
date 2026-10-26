const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const fs = require('node:fs/promises')
const { startServer, launchBrowser } = require('./test-support/browser.cjs')
const { installFixtures, pageOf, faq, improvement } = require('./test-support/fixtures.cjs')
let server, browser
const ok = (route, data) => route.fulfill({ json: { success: true, data } })
const stamp = '2026-10-20T12:00:00'
const metadata = {
  createdBy: 99,
  updatedBy: 100,
  createdAt: stamp,
  updatedAt: stamp,
  deletedAt: null,
}
const plan = {
  summary: {
    planId: 1,
    planCode: 'YOUTH_5G',
    name: '청년 데이터 무제한',
    networkType: 'FIVE_G',
    targetGroup: 'YOUTH',
    monthlyFee: 55000,
    dataAmountMb: null,
    dataUnlimited: true,
    exhaustedSpeedKbps: null,
    voiceMinutes: null,
    voiceUnlimited: true,
    smsCount: 100,
    smsUnlimited: false,
  },
  tetheringAmountMb: 5120,
  minAge: 14,
  maxAge: 29,
  description: '청년을 위한 데이터 요금제입니다.\n\n이용 조건과 제공량을 확인해 주세요.',
}
before(async () => {
  server = await startServer(path.resolve(__dirname, '..'), 4197)
  browser = await launchBrowser()
})
after(async () => {
  await browser?.close()
  server?.close()
})
async function withPage(run, width = 1440) {
  const context = await browser.newContext({
    viewport: { width, height: 1000 },
    reducedMotion: 'reduce',
  })
  const fixtures = await installFixtures(context, 'ADMIN')
  const page = await context.newPage()
  page.setDefaultTimeout(8000)
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  const goto = (route) => page.goto(`${server.origin}/#${route}`)
  const shot = async (name, locator = page) => {
    if (!process.env.TEST_REVIEW_DIR) return
    await fs.mkdir(process.env.TEST_REVIEW_DIR, { recursive: true })
    await locator.screenshot({ path: path.join(process.env.TEST_REVIEW_DIR, name + '.png') })
  }
  try {
    await run({ page, context, fixtures, goto, shot })
    assert.deepEqual(errors, [])
    assert.deepEqual(fixtures.unknown, [])
  } finally {
    await context.close()
  }
}

async function denseDashboard(context) {
  const ranks = Array.from({ length: 20 }, (_, index) => ({
    faqId: index + 1,
    question: `질문 ${index + 1}. 요금제 변경과 회선 개통, 기존 부가서비스 유지 조건 및 청구 예정 요금을 어디에서 확인할 수 있나요?`,
    intent: 'GENERAL',
    count: 100 - index,
    averageSimilarity: 0.95 - index * 0.01,
  }))
  const ranking = Object.fromEntries(
    ['all', 'general', 'userData', 'storeData', 'productData'].map((key) => [
      key,
      { top: ranks, low: [...ranks].reverse() },
    ]),
  )
  const similarities = ranks.map(({ faqId, question, intent, averageSimilarity }) => ({
    faqId,
    question,
    intent,
    averageSimilarity,
  }))
  const similarityRanking = Object.fromEntries(
    ['all', 'general', 'userData', 'storeData', 'productData'].map((key) => [
      key,
      { top: similarities, low: [...similarities].reverse() },
    ]),
  )
  await context.route('**/api/admin/faq-monitoring?**', (route) =>
    ok(route, {
      unansweredQuestionSummary: {
        totalQuestionCount: 1000,
        unansweredQuestionCount: 40,
        unansweredRate: 0.04,
      },
      faqUsageRanking: ranking,
      faqSimilarityRanking: { overallAverageSimilarity: 0.83, ...similarityRanking },
    }),
  )
  const calls = []
  await context.route('**/api/admin/faq-monitoring/improvements?**', (route) => {
    const query = new URL(route.request().url()).searchParams
    const page = Number(query.get('page'))
    calls.push({ page, size: Number(query.get('size')), types: query.getAll('types') })
    return ok(route, {
      items: Array.from({ length: 10 }, (_, index) => ({
        ...improvement,
        faqId: page * 10 + index + 1,
        question: ranks[index].question,
        faqVersion: 3,
        improvementTypes: ['LOW_USAGE', 'LOW_RAG_QUALITY', 'DUPLICATE_SUSPECTED'],
      })),
      page,
      size: 10,
      totalPages: 25,
      totalElements: 250,
      first: page === 0,
      last: page === 24,
      evaluatedAt: stamp,
    })
  })
  await context.route('**/api/admin/faq-monitoring/improvements/*/duplicates', (route) =>
    ok(
      route,
      ranks.slice(0, 5).map((item) => ({
        faqId: item.faqId + 30,
        question: item.question,
        top1Count: 10,
        pairCount: 7,
      })),
    ),
  )
  await context.route('**/api/admin/faqs/*', (route) =>
    ok(route, {
      ...faq,
      id: Number(new URL(route.request().url()).pathname.split('/').at(-1)),
      question: ranks[0].question,
    }),
  )
  await context.route('**/api/admin/faq-monitoring/faqs/*?**', (route) =>
    ok(route, {
      basicInfo: {
        faqId: 1,
        question: ranks[0].question,
        answer: faq.answer,
        categoryName: '요금·가입 안내',
        intent: 'GENERAL',
        version: 3,
        createdAt: stamp,
        updatedAt: stamp,
      },
      usageTrend: {
        period: 'MONTH',
        periodStart: '2026-10-01T00:00:00',
        periodEnd: stamp,
        totalCount: 210,
        points: Array.from({ length: 20 }, (_, index) => ({
          bucketStart: `2026-10-${String(index + 1).padStart(2, '0')}T00:00:00`,
          bucketEnd: `2026-10-${String(index + 1).padStart(2, '0')}T23:59:59`,
          faqVersion: 3,
          count: index + 1,
        })),
      },
      similarity: { averageSimilarity: 0.85, sampleCount: 20 },
      top1: { top1Count: 15, top1Rate: 0.75, overallAverageTop1Count: 12 },
      topGap: { averageGap: 0.08, sampleCount: 20 },
      cooccurringFaqs: ranks
        .slice(1, 6)
        .map((item) => ({ ...item, coOccurrenceCount: 6, coOccurrenceRate: 0.3 })),
    }),
  )
  return calls
}

test('실제 20개 순위와 10개 개선 행을 확대해도 정보가 겹치지 않고 4·5번 높이와 페이징 색을 유지한다', async () => {
  for (const width of [1440, 1024, 390])
    await withPage(async ({ page, context, goto, shot }) => {
      const calls = await denseDashboard(context)
      await goto('/admin/dashboard')
      await page.getByRole('textbox', { name: 'FAQ ID', exact: true }).fill('1')
      await page.locator('.faq-dashboard-detail__search button').click()
      await page
        .locator('.faq-dashboard-detail__basic b')
        .first()
        .filter({ hasText: /질문 1/ })
        .waitFor()
      const fifth = page.locator('.faq-dashboard-section--improvement')
      await fifth.locator('.faq-dashboard-improvement-table tbody tr').nth(9).waitFor()
      if (width > 1100) {
        const fourthBox = await page.locator('.faq-dashboard-section--detail').boundingBox()
        const fifthBox = await fifth.boundingBox()
        assert.ok(
          Math.abs(fourthBox.height - fifthBox.height) < 2,
          JSON.stringify({ fourthBox, fifthBox }),
        )
      }
      const fonts = await page
        .locator('.faq-dashboard-detail__search button, .faq-dashboard-improvement-filters button')
        .evaluateAll((items) =>
          items.map((el) => {
            const s = getComputedStyle(el)
            return [s.fontFamily, s.fontSize, s.fontWeight, s.lineHeight].join('|')
          }),
        )
      assert.equal(new Set(fonts).size, 1)
      await fifth.getByRole('button', { name: '활용도', exact: true }).click()
      await fifth.locator('.faq-dashboard-improvement-table tbody tr').nth(9).waitFor()
      assert.ok(calls.some((request) => request.page === 0 && request.types.includes('LOW_USAGE')))
      const selectedColor = await fifth
        .locator('.faq-dashboard-improvement-filters .is-active')
        .evaluate((el) => getComputedStyle(el).backgroundColor)
      assert.equal(
        await fifth
          .locator('.pagination__active')
          .evaluate((el) => getComputedStyle(el).backgroundColor),
        selectedColor,
      )
      await fifth.locator('.pagination').getByRole('button', { name: '2', exact: true }).click()
      await fifth
        .locator('.pagination button.pagination__active')
        .filter({ hasText: /^2$/ })
        .waitFor()
      assert.ok(calls.some((request) => request.page === 1 && request.size === 10))
      assert.ok(calls.every((request) => request.size === 10))
      const refresh = fifth.getByRole('button', { name: '개선이 필요한 FAQ 새로고침', exact: true })
      const refreshBox = await refresh.boundingBox()
      const iconBox = await refresh.locator('svg').boundingBox()
      assert.ok(iconBox.width >= 16 && refreshBox.height >= 32)
      await refresh.click()
      await fifth.locator('.faq-dashboard-improvement-table tbody tr').nth(9).waitFor()
      await shot(`dense-bottom-${width}`, page.locator('.faq-dashboard-pair--bottom'))
      for (const kind of ['usage', 'similarity', 'detail', 'improvement']) {
        const section = page.locator(`.faq-dashboard-section--${kind}`)
        await section.getByRole('button', { name: /전체화면$/ }).click()
        assert.equal(await section.evaluate((el) => el.scrollWidth <= el.clientWidth + 1), true)
        if (kind === 'usage' || kind === 'similarity') {
          assert.equal(await section.locator('.faq-dashboard-rank-card').count(), 20)
          const ticks = await section
            .locator('.recharts-xAxis-tick-labels text')
            .evaluateAll((items) =>
              items.map((item) => item.getBoundingClientRect().toJSON()).sort((a, b) => a.x - b.x),
            )
          assert.ok(ticks.length > 1)
          assert.ok(
            ticks.slice(1).every((tick, index) => tick.left >= ticks[index].right - 1),
            JSON.stringify({ width, kind, ticks }),
          )
          const geometry = await section.locator('.faq-dashboard-rank-card').evaluateAll((cards) =>
            cards.map((card) => {
              const parent = card.getBoundingClientRect()
              const children = [...card.children]
                .filter((child) => getComputedStyle(child).display !== 'none')
                .map((child) => child.getBoundingClientRect())
              return {
                inside: children.every(
                  (child) => child.left >= parent.left - 1 && child.right <= parent.right + 1,
                ),
                overlap: children.some((a, index) =>
                  children
                    .slice(index + 1)
                    .some(
                      (b) =>
                        Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 &&
                        Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1,
                    ),
                ),
              }
            }),
          )
          assert.ok(
            geometry.every(({ inside, overlap }) => inside && !overlap),
            JSON.stringify({ width, kind, geometry }),
          )
        }
        await shot(`dense-expanded-${kind}-${width}`, section)
        if (kind === 'improvement') {
          await section.locator('.faq-dashboard-improvement-table tbody tr').first().click()
          await section
            .locator('.faq-dashboard-improvement-duplicates__table-wrap tbody tr')
            .nth(4)
            .waitFor()
          assert.equal(await section.evaluate((el) => el.scrollWidth <= el.clientWidth + 1), true)
          await section.getByRole('button', { name: 'AI 검토', exact: true }).click()
          const review = page.getByRole('dialog', { name: 'FAQ AI 검토', exact: true })
          await review.waitFor()
          assert.equal(
            await review.evaluate((el) => {
              const r = el.getBoundingClientRect()
              return el.contains(
                document.elementFromPoint(r.x + r.width / 2, r.y + Math.min(100, r.height / 2)),
              )
            }),
            true,
          )
          await shot(`review-over-expanded-${width}`, review)
          await page.keyboard.press('Escape')
          assert.equal(await review.count(), 0)
          assert.equal(await section.getAttribute('aria-modal'), 'true')
        }
        await page.keyboard.press('Escape')
      }
    }, width)
})

test('모든 상품 종류는 읽기 전용 상세정보와 삭제된 상품의 상세 조회를 제공한다', async () => {
  await withPage(async ({ page, context, goto, shot }) => {
    const cases = [
      {
        endpoint: 'plans',
        label: '요금제',
        detail: plan,
        expected: ['55,000원', '5GB', '14세', '29세'],
      },
      {
        endpoint: 'addon-services',
        label: '부가서비스',
        detail: {
          addonServiceId: 2,
          code: 'SAFETY_FREE',
          name: '무료 안심 서비스',
          category: 'SAFETY',
          monthlyFee: 0,
          description: '무료로 제공되는 서비스입니다.',
        },
        expected: ['안심·보호', '0원'],
      },
      {
        endpoint: 'bundle-products',
        label: '결합상품',
        detail: {
          bundleProductId: 3,
          code: 'HOME_BUNDLE',
          name: '홈 결합',
          bundleType: 'HOME',
          lineCount: null,
          discountAmount: 5500,
          homeProductId: 31,
          description: '가족과 함께 이용합니다.',
        },
        expected: ['5,500원', '상품 #31'],
      },
      {
        endpoint: 'roaming-products',
        label: '로밍 상품',
        detail: {
          roamingProductId: 4,
          code: 'JP_DATA',
          name: '일본 데이터 로밍',
          country: '일본',
          dailyFee: 3900,
          dataAmountMb: 5120,
          description: '일본에서 데이터를 사용합니다.',
        },
        expected: ['일본', '3,900원', '5GB'],
      },
      {
        endpoint: 'home-products',
        label: '인터넷/IPTV',
        detail: {
          homeProductId: 5,
          code: 'IPTV',
          name: 'IPTV 기본',
          productType: 'IPTV',
          speedMbps: null,
          monthlyFee: 15000,
          description: null,
        },
        expected: ['15,000원', '등록된 상품 설명이 없습니다.'],
      },
    ]
    for (const item of cases) {
      await context.route(`**/api/admin/${item.endpoint}?**`, (route) => {
        const deleted = new URL(route.request().url()).searchParams.get('deleted') === 'true'
        return ok(
          route,
          pageOf([
            {
              detail: item.detail,
              metadata: { ...metadata, deletedAt: deleted ? stamp : null },
              status: 'ACTIVE',
            },
          ]),
        )
      })
      await goto(`/admin/products/${item.endpoint}`)
      await page.getByRole('button', { name: '상세정보', exact: true }).click()
      const dialog = page.getByRole('dialog', { name: `${item.label} 상세정보`, exact: true })
      await dialog.waitFor()
      for (const text of item.expected)
        await dialog.getByText(text, { exact: true }).first().waitFor()
      assert.equal(await dialog.locator('input, textarea, select').count(), 0)
      if (item.endpoint === 'plans') await shot('product-detail-plan', dialog)
      await page.keyboard.press('Escape')
      await page.getByRole('tab', { name: '삭제된 상품', exact: true }).click()
      await page.getByRole('button', { name: '상세정보', exact: true }).click()
      await dialog.getByText('삭제됨', { exact: true }).waitFor()
      assert.equal(await dialog.getByRole('button').count(), 1)
      await page.keyboard.press('Escape')
    }
  })
})

test('포함 부가서비스 창은 카테고리·검색 결과 및 포함 개수와 관계없이 같은 크기를 유지한다', async () => {
  for (const width of [1440, 768, 390])
    await withPage(async ({ page, context, goto, shot }) => {
      await context.route('**/api/admin/plans?**', (route) =>
        ok(route, pageOf([{ detail: plan, metadata, status: 'ACTIVE' }])),
      )
      const addons = Array.from({ length: 40 }, (_, index) => ({
        addonServiceId: index + 1,
        code: `ADDON_${index}`,
        name: `부가서비스 ${index + 1}`,
        category: index < 36 ? 'DATA_CHARGE' : 'CONTENT',
        monthlyFee: 1000,
        description: null,
      }))
      await context.route('**/api/admin/addon-services?**', (route) =>
        ok(route, pageOf(addons.map((detail) => ({ detail, metadata, status: 'ACTIVE' })))),
      )
      await context.route('**/api/plans/1/included-addons', (route) => ok(route, [addons[0]]))
      await goto('/admin/products/plans')
      await page.locator('.admin-product-table .faq-row-actions button').first().waitFor()
      const backgrounds = await page
        .locator('.admin-product-table .faq-row-actions button')
        .evaluateAll((buttons) => buttons.map((button) => getComputedStyle(button).backgroundColor))
      assert.equal(new Set(backgrounds).size, 5)
      await page.getByRole('button', { name: '포함 부가서비스', exact: true }).click()
      const dialog = page.getByRole('dialog', { name: '포함 부가서비스', exact: true })
      await dialog.getByRole('button', { name: '부가서비스 1 제외', exact: true }).waitFor()
      const initial = await dialog.boundingBox()
      for (const category of ['콘텐츠', '음성 충전', '전체']) {
        await dialog.getByRole('button', { name: category, exact: true }).click()
        const next = await dialog.boundingBox()
        assert.ok(
          Math.abs(initial.height - next.height) < 1 && Math.abs(initial.width - next.width) < 1,
        )
      }
      await dialog.getByLabel('부가서비스 검색', { exact: true }).fill('없는 서비스')
      assert.equal((await dialog.boundingBox()).height, initial.height)
      await dialog.getByLabel('부가서비스 검색', { exact: true }).fill('')
      await dialog.getByRole('button', { name: '부가서비스 2 추가', exact: true }).click()
      await dialog.getByRole('button', { name: '부가서비스 2 제외', exact: true }).waitFor()
      assert.equal((await dialog.boundingBox()).height, initial.height)
      assert.equal(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1), true)
      await shot(`fixed-addons-${width}`, dialog)
      await dialog.getByRole('button', { name: '부가서비스 2 제외', exact: true }).click()
      assert.equal((await dialog.boundingBox()).height, initial.height)
      if (width < 720) await shot(`fixed-addons-selected-${width}`, dialog)
    }, width)
})

test('기본·처리·실행·통신지도 새로고침 버튼은 왼쪽 선택 메뉴와 같은 보라색을 사용한다', async () => {
  await withPage(async ({ page, context, goto, shot }) => {
    await goto('/admin/unanswered-groups')
    const navColor = await page
      .locator('.admin-navigation__item--active')
      .first()
      .evaluate((el) => getComputedStyle(el).backgroundColor)
    assert.equal(navColor, 'rgb(49, 46, 129)')
    const process = page.getByRole('button', { name: '처리', exact: true })
    assert.equal(await process.evaluate((el) => getComputedStyle(el).backgroundColor), navColor)
    await goto('/admin/embedding-backfill')
    const execute = page.getByRole('button', { name: '실행', exact: true })
    await execute.first().waitFor()
    assert.ok(
      (
        await execute.evaluateAll((items) =>
          items.map((el) => getComputedStyle(el).backgroundColor),
        )
      ).every((color) => color === navColor),
    )
    await context.route('**/api/admin/telemap/alerts?**', (route) => ok(route, pageOf([])))
    await goto('/admin/telemap')
    assert.equal(
      await page
        .getByRole('button', { name: '새로고침', exact: true })
        .evaluate((el) => getComputedStyle(el).backgroundColor),
      navColor,
    )
    await shot('telemap-primary')
  })
})

test('FAQ 변경 기록은 상단 메타데이터 아래에 버전 기록과 답변을 배치하고 닫기는 한 개만 제공한다', async () => {
  await withPage(async ({ page, context, goto, shot }) => {
    await context.route('**/api/admin/faqs?**', (route) =>
      ok(
        route,
        pageOf([
          {
            ...faq,
            version: 3,
            answer: '현재 답변입니다.\n\n' + '상세한 답변 내용을 읽을 수 있습니다.\n'.repeat(25),
          },
        ]),
      ),
    )
    await context.route('**/api/admin/old-faqs/faq?**', (route) =>
      ok(
        route,
        pageOf([
          {
            faqId: 1,
            version: 2,
            categoryId: 1,
            question: '이전 질문',
            answer: '이전 답변',
            intent: 'GENERAL',
            createdById: 99,
            updatedById: 100,
            updatedAt: stamp,
          },
        ]),
      ),
    )
    await goto('/admin/faqs')
    await page.getByRole('button', { name: '변경 기록', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'FAQ 변경 기록', exact: true })
    await dialog.getByRole('button', { name: /v2/ }).waitFor()
    assert.equal(await dialog.getByRole('button', { name: '닫기', exact: true }).count(), 1)
    const meta = await dialog.locator(':scope > .faq-reader-meta').boundingBox()
    const versions = await dialog.locator('.faq-version-selector').boundingBox()
    const content = await dialog.locator('.faq-version-content').boundingBox()
    assert.ok(meta.y + meta.height <= versions.y && versions.y + versions.height <= content.y)
    await dialog.getByRole('button', { name: /v2/ }).click()
    await dialog.getByText('이전 답변', { exact: true }).waitFor()
    await shot('history-meta-first', dialog)
  })
})
