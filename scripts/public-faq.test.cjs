const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const fs = require('node:fs/promises')
const { startServer, launchBrowser } = require('./test-support/browser.cjs')
const { installFixtures, pageOf } = require('./test-support/fixtures.cjs')
let server, browser
before(async () => {
  server = await startServer(path.resolve(__dirname, '..'), 4209)
  browser = await launchBrowser()
})
after(async () => {
  await browser?.close()
  server?.close()
})
async function scenario(role, run) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
  })
  const fixtures = await installFixtures(context, role)
  const rows = [
    ...Array.from({ length: 12 }, (_, index) => ({
      id: index + 1,
      category: '와이파이',
      question: `와이파이 질문 ${index + 1}`,
      answer: `공식 와이파이 답변 ${index + 1}`,
    })),
    { id: 13, category: '문자', question: '문자 연동 질문', answer: '공식 문자 답변' },
  ]
  const state = { failDetail: false, failCategories: false, reads: [] }
  await context.route('**/api/public/faqs**', (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      pathname = url.pathname
    state.reads.push({
      pathname,
      query: url.search,
      authorization: request.headers().authorization,
    })
    const ok = (data) => route.fulfill({ json: { success: true, data } })
    const fail = () =>
      route.fulfill({ status: 503, json: { success: false, message: '조회 실패' } })
    if (pathname.endsWith('/categories'))
      return state.failCategories
        ? fail()
        : ok([
            { name: '와이파이', count: 12 },
            { name: '문자', count: 1 },
            { name: '기타', count: 0 },
          ])
    if (pathname === '/api/public/faqs') {
      const category = url.searchParams.get('category'),
        page = Number(url.searchParams.get('page')),
        size = Number(url.searchParams.get('size'))
      const filtered = rows.filter((row) => !category || row.category === category)
      return ok({
        ...pageOf(
          filtered.slice(page * size, page * size + size).map(({ answer, ...summary }) => summary),
        ),
        page,
        size,
        totalPages: Math.ceil(filtered.length / size),
        totalElements: filtered.length,
        first: page === 0,
        last: (page + 1) * size >= filtered.length,
      })
    }
    if (state.failDetail) return fail()
    return ok(rows.find((row) => String(row.id) === pathname.split('/').at(-1)))
  })
  const page = await context.newPage(),
    errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.setDefaultTimeout(8000)
  try {
    await page.goto(server.origin + '/#/customer-center?section=faq')
    await page.getByRole('heading', { name: '자주 묻는 질문', exact: true }).waitFor()
    await run({ page, state })
    assert.ok(state.reads.every((read) => !read.authorization))
    assert.equal(
      fixtures.requests.filter((request) => request.path.startsWith('/api/admin/')).length,
      0,
    )
    assert.deepEqual(errors, [])
    assert.deepEqual(fixtures.unknown, [])
  } finally {
    await context.close()
  }
}

test('비로그인 고객은 묶인 카테고리로 전체 FAQ를 조회하고 페이지 이동·상세를 사용할 수 있다', async () => {
  await scenario(null, async ({ page, state }) => {
    const categories = page.getByRole('combobox', { name: 'FAQ 카테고리' })
    await categories.selectOption({ label: '와이파이 (12)' })
    await page.getByText('전체 12개', { exact: true }).waitFor()
    assert.equal(await page.locator('.customer-faq details').count(), 10)
    assert.equal(state.reads.filter((read) => /\/\d+$/.test(read.pathname)).length, 0)
    await page.getByText('와이파이 질문 1', { exact: true }).click()
    await page.getByText('공식 와이파이 답변 1', { exact: true }).waitFor()
    await page
      .getByRole('navigation', { name: 'FAQ 페이지' })
      .getByRole('button', { name: '다음', exact: true })
      .click()
    await page.getByText('와이파이 질문 11', { exact: true }).waitFor()
    await categories.selectOption({ label: '문자 (1)' })
    await page.getByText('문자 연동 질문', { exact: true }).waitFor()
    assert.ok(
      state.reads.some(
        (read) =>
          new URLSearchParams(read.query).get('category') === '문자' &&
          new URLSearchParams(read.query).get('page') === '0',
      ),
    )
    await categories.selectOption({ label: '기타 (0)' })
    await page.getByText('선택한 카테고리에 등록된 질문이 없습니다.', { exact: true }).waitFor()
    await categories.selectOption({ label: '전체' })
    await page.getByText('전체 13개', { exact: true }).waitFor()
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 })
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
      if (process.env.TEST_REVIEW_DIR) {
        await fs.mkdir(process.env.TEST_REVIEW_DIR, { recursive: true })
        await page.screenshot({
          path: path.join(process.env.TEST_REVIEW_DIR, `public-faq-${width}.png`),
          fullPage: true,
        })
      }
    }
  })
})

test('로그인 상태에서도 공개 조회는 토큰 없이 요청하고 상세 실패를 재조회할 수 있다', async () => {
  await scenario('USER', async ({ page, state }) => {
    await page.getByText('와이파이 질문 1', { exact: true }).waitFor()
    state.failDetail = true
    await page.getByText('와이파이 질문 1', { exact: true }).click()
    await page.getByText('답변을 불러오지 못했습니다.', { exact: false }).waitFor()
    state.failDetail = false
    await page.getByRole('button', { name: '답변 다시 불러오기', exact: true }).click()
    await page.getByText('공식 와이파이 답변 1', { exact: true }).waitFor()
  })
})
