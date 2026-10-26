const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const fs = require('node:fs/promises')
const { startServer, launchBrowser } = require('./test-support/browser.cjs')
const { installFixtures, pageOf, faq } = require('./test-support/fixtures.cjs')
let server, browser
const ok = (route, data) => route.fulfill({ json: { success: true, data } })
before(async () => {
  server = await startServer(path.resolve(__dirname, '..'), 4198)
  browser = await launchBrowser()
})
after(async () => {
  await browser?.close()
  server?.close()
})
async function withPage(run, role = 'ADMIN', width = 1440) {
  const context = await browser.newContext({
    viewport: { width, height: 1000 },
    reducedMotion: 'reduce',
  })
  const fixtures = await installFixtures(context, role)
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

test('FAQ 5개 영역을 필터 상태 유지한 채 확대하고 Escape로 원래 위치에 복귀한다', async () => {
  await withPage(async ({ page, goto, shot }) => {
    await goto('/admin/dashboard')
    await page.locator('.faq-dashboard-section--usage .faq-dashboard-rank-card').first().waitFor()
    const widths = await page
      .locator('.faq-dashboard-section')
      .evaluateAll((sections) => sections.slice(1).map((s) => s.getBoundingClientRect().width))
    assert.ok(Math.max(...widths) - Math.min(...widths) < 2, String(widths))
    await shot('dashboard-1440')
    for (const kind of ['unanswered', 'usage', 'similarity', 'detail', 'improvement']) {
      const section = page.locator(`.faq-dashboard-section--${kind}`)
      const trigger = section.getByRole('button', { name: /전체화면$/ })
      await trigger.click()
      const expanded = page.getByRole('dialog')
      assert.ok((await expanded.boundingBox()).width > 1300)
      if (kind === 'usage') {
        await expanded.getByRole('button', { name: 'LOW 20', exact: true }).click()
        await shot('dashboard-usage-expanded', expanded)
      }
      if (kind === 'detail') await shot('dashboard-detail-expanded', expanded)
      await page.keyboard.press('Escape')
      assert.equal(await page.getByRole('dialog').count(), 0)
      assert.equal(await trigger.evaluate((el) => el === document.activeElement), true)
    }
    assert.equal(
      await page
        .locator('.faq-dashboard-section--usage')
        .getByRole('button', { name: 'LOW 20', exact: true })
        .getAttribute('class'),
      'is-active',
    )
    assert.equal(await page.evaluate(() => document.body.style.overflow), '')
  })
})

test('관리자 달력은 날짜 선택·키보드 이동·날짜 범위 검증과 조회 값을 유지한다', async () => {
  await withPage(async ({ page, goto, shot }) => {
    await goto('/admin/dashboard')
    await page.getByRole('button', { name: '시작 날짜 달력 열기', exact: true }).click()
    const calendar = page.getByRole('dialog', { name: '시작 날짜 날짜 선택', exact: true })
    await calendar.waitFor()
    await calendar.getByLabel('달력 월', { exact: true }).selectOption('9')
    await shot('calendar-admin', calendar)
    await calendar.getByRole('gridcell', { name: '2026년 10월 15일', exact: true }).click()
    assert.equal(await page.getByLabel('시작 날짜', { exact: true }).inputValue(), '2026-10-15')
    await page.getByLabel('시작 날짜', { exact: true }).press('Alt+ArrowDown')
    await calendar
      .getByRole('gridcell', { name: '2026년 10월 15일', exact: true })
      .press('ArrowRight')
    await page.keyboard.press('Enter')
    assert.equal(await page.getByLabel('시작 날짜', { exact: true }).inputValue(), '2026-10-16')
    await page.getByRole('button', { name: '사용량 추이 기준 날짜 달력 열기' }).click()
    const bounded = page.getByRole('dialog', { name: '사용량 추이 기준 날짜 날짜 선택' })
    assert.equal(
      await bounded.getByRole('gridcell', { name: '2026년 10월 21일', exact: true }).isDisabled(),
      true,
    )
    await page.keyboard.press('Escape')
    await page.locator('.faq-dashboard-date-inputs > button').click()
  })
})

test('공지 일시 달력의 시간 값을 저장하며 Escape는 달력부터 닫는다', async () => {
  await withPage(async ({ page, context, goto, shot }) => {
    let saved
    await context.route('**/api/admin/notices', (route) => {
      if (route.request().method() !== 'POST') return ok(route, pageOf([]))
      saved = route.request().postDataJSON()
      return ok(route, { detail: { noticeId: 3, ...saved }, metadata: {} })
    })
    await goto('/admin/notices')
    await page.getByRole('button', { name: '공지·장애 등록', exact: true }).click()
    const form = page.locator('.admin-notice-form')
    await form.getByRole('button', { name: '배너 노출 종료 일시 달력 열기', exact: true }).click()
    const calendar = page.getByRole('dialog', { name: '배너 노출 종료 일시 날짜 선택' })
    await calendar.getByRole('gridcell', { name: '2026년 10월 22일', exact: true }).click()
    await calendar.getByLabel('배너 노출 종료 일시 시간', { exact: true }).fill('18:30')
    await shot('calendar-datetime', calendar)
    await page.keyboard.press('Escape')
    assert.equal(await form.isVisible(), true)
    assert.equal(await page.locator('[data-date-picker]:popover-open').count(), 0)
    assert.equal(
      await form.getByLabel('배너 노출 종료 일시', { exact: true }).inputValue(),
      '2026-10-22T18:30',
    )
    await form.getByLabel('제목', { exact: true }).fill('달력 검증 공지')
    await form.getByLabel('내용', { exact: true }).fill('지정한 일시까지 노출됩니다.')
    await form.getByRole('button', { name: '저장', exact: true }).click()
    await page.waitForFunction(() => !document.querySelector('.admin-notice-form'))
    assert.equal(saved.endsAt, '2026-10-22T18:30:00')
  })
})

test('사용자 생년월일 달력은 핑크색으로 표시하고 미래 날짜는 선택할 수 없다', async () => {
  await withPage(
    async ({ page, goto, shot }) => {
      await goto('/auth/signup')
      await page.getByRole('button', { name: '생년월일 달력 열기' }).click()
      const calendar = page.getByRole('dialog', { name: '생년월일 날짜 선택' })
      await calendar.getByLabel('달력 연도', { exact: true }).selectOption('1995')
      await calendar.getByLabel('달력 월', { exact: true }).selectOption('0')
      await shot('calendar-user', calendar)
      await calendar.getByRole('gridcell', { name: '1995년 1월 10일', exact: true }).click()
      assert.equal(await page.getByLabel('생년월일', { exact: true }).inputValue(), '1995-01-10')
      await page.getByLabel('생년월일', { exact: true }).fill('2026-10-21')
      assert.equal(
        await page
          .getByLabel('생년월일', { exact: true })
          .evaluate((el) => el.validity.rangeOverflow),
        true,
      )
    },
    null,
    390,
  )
})

test('FAQ 상세·버전 기록의 긴 답변을 넓은 읽기 영역에서 생략 없이 표시한다', async () => {
  await withPage(async ({ page, context, goto, shot }) => {
    const answer =
      '요금제는 내 정보에서 변경할 수 있습니다.\n\n1. 현재 이용 중인 요금제를 확인합니다.\n2. 월 요금과 데이터 제공량을 비교합니다.\n3. 변경할 요금제를 선택한 뒤 신청합니다.\n\n' +
      '변경된 요금은 이용 기간에 따라 계산됩니다. 자세한 청구 내역은 내 정보의 요금·청구 내역에서 확인해 주세요.\n\n'.repeat(
        12,
      )
    await context.route('**/api/admin/faqs?**', (route) =>
      ok(route, pageOf([{ ...faq, version: 3, answer }])),
    )
    await context.route('**/api/admin/old-faqs/faq?**', (route) =>
      ok(
        route,
        pageOf([
          {
            faqId: 1,
            version: 2,
            categoryId: 1,
            question: faq.question,
            answer: '이전 버전의 안내입니다.\n\n변경 전 기준으로 작성된 답변입니다.',
            intent: 'GENERAL',
            createdById: 99,
            updatedById: 99,
            updatedAt: '2026-10-19T12:00:00',
          },
        ]),
      ),
    )
    await goto('/admin/faqs')
    await page.getByRole('button', { name: '상세정보', exact: true }).click()
    const detail = page.getByRole('dialog', { name: 'FAQ 상세정보', exact: true })
    assert.equal(await detail.locator('.faq-reader__answer > div').innerText(), answer)
    assert.ok((await detail.boundingBox()).width > 1000)
    await shot('faq-detail', detail)
    await detail.getByRole('button', { name: '닫기', exact: true }).first().click()
    await page.getByRole('button', { name: '변경 기록', exact: true }).click()
    const history = page.getByRole('dialog', { name: 'FAQ 변경 기록' })
    await history.getByRole('button', { name: /v2/ }).click()
    await history.getByText('이전 버전의 안내입니다.', { exact: false }).waitFor()
    await shot('faq-history', history)
    await history.getByRole('button', { name: /현재 v3/ }).click()
    assert.equal(await history.locator('.faq-reader__answer > div').innerText(), answer)
    await history.getByText('v2 대비 변경 항목: 답변', { exact: true }).waitFor()
    await page.keyboard.press('Escape')
  })
})

test('포함 부가서비스는 카테고리·검색과 별도 선택 목록을 제공하고 전체 페이지에서 불러온다', async () => {
  await withPage(async ({ page, context, goto, shot }) => {
    const addon = (id, name, category) => ({
      addonServiceId: id,
      code: `ADDON_${id}`,
      name,
      category,
      monthlyFee: 1000,
      description: null,
    })
    const a = addon(1, '데이터 충전 1GB', 'DATA_CHARGE'),
      b = addon(2, '안심 보호', 'SAFETY'),
      c = addon(3, '콘텐츠 이용권', 'CONTENT')
    const product = {
      detail: {
        summary: {
          planId: 1,
          planCode: 'BASIC',
          name: '베이직',
          networkType: 'FIVE_G',
          targetGroup: 'GENERAL',
          monthlyFee: 33000,
          dataAmountMb: 10240,
          dataUnlimited: false,
          exhaustedSpeedKbps: 1000,
          voiceMinutes: 100,
          voiceUnlimited: false,
          smsCount: 100,
          smsUnlimited: false,
        },
        description: '상품 설명',
        tetheringAmountMb: 1024,
        minAge: null,
        maxAge: null,
      },
      status: 'ACTIVE',
      metadata: {},
    }
    await context.route('**/api/admin/plans?**', (route) => ok(route, pageOf([product])))
    await context.route('**/api/admin/plans/1', (route) => ok(route, product))
    const pages = []
    await context.route('**/api/admin/addon-services?**', (route) => {
      const number = Number(new URL(route.request().url()).searchParams.get('page'))
      pages.push(number)
      return ok(route, {
        ...pageOf((number ? [c] : [a, b]).map((detail) => ({ detail }))),
        totalPages: 2,
        last: number === 1,
      })
    })
    await context.route('**/api/plans/1/included-addons', (route) => ok(route, [b]))
    let saved
    await context.route('**/api/admin/plans/1/included-addons', (route) => {
      saved = route.request().postDataJSON()
      return ok(route, [a, c])
    })
    await goto('/admin/products/plans')
    await page.getByRole('button', { name: '포함 부가서비스', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: '포함 부가서비스', exact: true })
    const available = dialog.getByRole('region', { name: '추가할 부가서비스', exact: true })
    const selected = dialog.getByRole('region', { name: '포함된 부가서비스', exact: true })
    await selected.getByRole('button', { name: '안심 보호 제외' }).waitFor()
    await dialog.getByRole('button', { name: '콘텐츠', exact: true }).click()
    assert.equal(await available.getByRole('button', { name: '데이터 충전 1GB 추가' }).count(), 0)
    await available.getByRole('button', { name: '콘텐츠 이용권 추가' }).click()
    await selected.getByRole('button', { name: '콘텐츠 이용권 제외' }).waitFor()
    await dialog.getByRole('button', { name: '전체', exact: true }).click()
    await dialog.getByLabel('부가서비스 검색', { exact: true }).fill('데이터')
    await available.getByRole('button', { name: '데이터 충전 1GB 추가' }).click()
    await selected.getByRole('button', { name: '안심 보호 제외' }).click()
    await shot('included-addons', dialog)
    await dialog.getByRole('button', { name: '저장', exact: true }).click()
    await dialog.getByText('저장했습니다.', { exact: true }).waitFor()
    assert.deepEqual(saved.addonServiceIds.sort(), [1, 3])
    assert.deepEqual([...new Set(pages)].sort(), [0, 1])
    await dialog.getByRole('button', { name: '닫기', exact: true }).click()
    await page.getByRole('button', { name: '수정', exact: true }).click()
    const edit = page.getByRole('dialog', { name: '요금제 수정', exact: true })
    await edit.getByRole('combobox').first().waitFor()
    const fonts = await edit
      .locator('input, select, textarea')
      .evaluateAll((elements) => elements.map((el) => getComputedStyle(el).fontFamily))
    assert.equal(new Set(fonts).size, 1)
    await edit.getByRole('combobox').first().click()
    await shot('product-edit-dropdown')
    await page.keyboard.press('Escape')
    assert.equal(await edit.isVisible(), true)
    await page.keyboard.press('Escape')
    assert.equal(await edit.count(), 0)
  })
})

test('미응답 질문은 번호·사유·일시로 구분하고 관리자 검색 및 드롭다운은 공통 디자인을 사용한다', async () => {
  await withPage(async ({ page, context, goto, shot }) => {
    await context.route('**/api/admin/unanswered-groups/1', (route) =>
      ok(route, {
        id: 1,
        representativeQuestion: '회선 개통 방법이 궁금합니다.',
        topicName: '회선 개통',
        questionCount: 3,
        status: 'PENDING',
        resolvedFaqId: null,
        lastOccurredAt: '2026-10-20T12:00:00',
        questions: [1, 2, 3].map((id) => ({
          id,
          question: `${id}번째 개통 관련 질문입니다. 안내받을 수 있을까요?`,
          searchQuery: '',
          reason: 'NO_FAQ',
          bestSimilarity: 0.35,
          createdAt: '2026-10-20T12:00:00',
        })),
      }),
    )
    await goto('/admin/unanswered-groups')
    await page.getByRole('button', { name: '처리', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: '미응답 질문 묶음 #1' })
    assert.deepEqual(await dialog.locator('.unanswered-question-number').allTextContents(), [
      '1',
      '2',
      '3',
    ])
    await shot('unanswered-group', dialog)
    await page.keyboard.press('Escape')
    await goto('/admin/stores')
    await page.getByRole('heading', { name: '매장 관리', exact: true }).waitFor()
    await shot('store-filters', page.locator('.admin-content'))
    await page.getByLabel('매장명 검색').fill('강남')
    await page.getByRole('button', { name: '초기화', exact: true }).click()
    assert.equal(await page.getByLabel('매장명 검색').inputValue(), '')
    await goto('/admin/inquiries')
    await page.getByLabel('처리상태').click()
    await shot('inquiry-select')
    await page.keyboard.press('Escape')
    await goto('/admin/forbidden-words')
    await page.getByRole('heading', { name: '금지어 관리', exact: true }).waitFor()
    await shot('forbidden-filters', page.locator('.admin-content'))
  })
})

test('FAQ 확대 화면과 관리자 캘린더가 모바일 화면 안에 맞는다', async () => {
  for (const width of [768, 390])
    await withPage(
      async ({ page, goto, shot }) => {
        await goto('/admin/dashboard')
        await page.getByRole('button', { name: 'FAQ 상세정보 전체화면', exact: true }).click()
        const dialog = page.getByRole('dialog', { name: 'FAQ 상세정보', exact: true })
        assert.equal(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1), true)
        await shot(`detail-expanded-${width}`, dialog)
        await page.keyboard.press('Escape')
        await page.getByRole('button', { name: '시작 날짜 달력 열기', exact: true }).click()
        const calendar = page.getByRole('dialog', { name: '시작 날짜 날짜 선택', exact: true })
        const box = await calendar.boundingBox()
        assert.ok(box.x >= 0 && box.x + box.width <= width)
        await shot(`calendar-admin-${width}`, calendar)
      },
      'ADMIN',
      width,
    )
})
