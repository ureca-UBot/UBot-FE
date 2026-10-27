const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const fs = require('node:fs')
const root = path.resolve(__dirname, '..')
const { startServer, launchBrowser } = require('./test-support/browser.cjs')
const { installFixtures } = require('./test-support/fixtures.cjs')
let server, browser

before(async () => {
  server = await startServer(root, 4201)
  browser = await launchBrowser()
})
after(async () => {
  await browser?.close()
  server?.close()
})

const summary = (id, hasCounsel = false) => ({
  conversationId: id,
  title: `대화 ${id}`,
  lastQuestionAt: '2026-10-20T12:00:00',
  hasCounsel,
})

async function confirmDelete(page, history, id) {
  await history.getByRole('button', { name: `대화 ${id} 대화 삭제`, exact: true }).click()
  const dialog = page.getByRole('dialog', { name: '대화를 삭제할까요?' })
  await dialog.waitFor()
  assert.equal(await dialog.locator('.conversation-delete-title').textContent(), `대화 ${id}`)
  await dialog.getByRole('button', { name: '삭제', exact: true }).click()
}

async function scenario(name, options, check) {
  await test(name, { timeout: 25000 }, async () => {
    const context = await browser.newContext({
      viewport: options.mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
    })
    const fixtures = await installFixtures(context, 'USER')
    const state = { items: options.items ?? [summary('a'), summary('b')], deletes: [], pages: [] }
    let release
    const gate = new Promise((resolve) => {
      release = resolve
    })
    await context.route('**/api/conversations/**', async (route) => {
      const request = route.request()
      const url = new URL(request.url())
      const id = url.pathname.split('/').at(-1)
      const ok = (data) => route.fulfill({ json: { success: true, data } })
      if (request.method() === 'DELETE') {
        state.deletes.push(id)
        if (options.holdDelete) await gate
        if (options.error)
          return route.fulfill({
            status: options.error.status,
            json: { success: false, ...options.error },
          })
        state.items = state.items.filter((item) => item.conversationId !== id)
        return route.fulfill({ status: 204 })
      }
      if (id === 'me') {
        const page = Number(url.searchParams.get('page'))
        state.pages.push(page)
        const content = state.items.slice(page * 20, (page + 1) * 20)
        return ok({
          content,
          page,
          size: 20,
          totalElements: state.items.length,
          totalPages: Math.ceil(state.items.length / 20),
          first: page === 0,
          last: (page + 1) * 20 >= state.items.length,
        })
      }
      if (id === 'messages') {
        const conversationId = url.pathname.split('/').at(-2)
        return ok([
          {
            id: 1,
            question: `질문 ${conversationId}`,
            answer: `답변 ${conversationId}`,
            createdAt: '2026-10-20T12:00:00',
          },
        ])
      }
      return route.fallback()
    })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.setDefaultTimeout(8000)
    page.on('dialog', async (dialog) => {
      errors.push('브라우저 기본 확인창을 사용하면 안 됩니다.')
      await dialog.dismiss()
    })
    try {
      await page.goto(server.origin + '/#/ai')
      if (options.mobile)
        await page.getByRole('button', { name: '최근 대화 열기', exact: true }).click()
      const history = page.locator(
        options.mobile ? '.ai-history-drawer .history-block' : '.ai-left .history-block',
      )
      await history.locator('.history-select').first().waitFor()
      await page.waitForFunction(() => !document.querySelector('.history-select')?.disabled)
      await check({ page, history, state, release })
      assert.deepEqual(errors, [])
      assert.deepEqual(fixtures.unknown, [])
    } finally {
      release()
      await context.close()
    }
  })
}

scenario(
  '선택한 대화 삭제: 빈 본문 204 처리 후 목록과 현재 대화를 비운다',
  {},
  async ({ page, history, state }) => {
    await history.getByTitle('대화 a', { exact: true }).click()
    await page.getByText('답변 a', { exact: true }).waitFor()
    await confirmDelete(page, history, 'a')
    await history
      .getByRole('button', { name: '대화 a 대화 삭제', exact: true })
      .waitFor({ state: 'detached' })
    await page.locator('#aiHomeView:not(.hidden)').waitFor()
    assert.equal(await page.getByText('답변 a', { exact: true }).count(), 0)
    assert.deepEqual(state.deletes, ['a'])
  },
)

scenario('다른 대화를 삭제해도 현재 답변은 보존한다', {}, async ({ page, history, state }) => {
  await history.getByTitle('대화 a', { exact: true }).click()
  await page.getByText('답변 a', { exact: true }).waitFor()
  await confirmDelete(page, history, 'b')
  await history
    .getByRole('button', { name: '대화 b 대화 삭제', exact: true })
    .waitFor({ state: 'detached' })
  assert.equal(await page.getByText('답변 a', { exact: true }).isVisible(), true)
  assert.deepEqual(state.deletes, ['b'])
})

scenario('삭제 확인을 취소하면 요청을 보내지 않는다', {}, async ({ page, history, state }) => {
  await history.getByRole('button', { name: '대화 a 대화 삭제', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: '대화를 삭제할까요?' })
  await dialog.getByRole('button', { name: '취소', exact: true }).click()
  await dialog.waitFor({ state: 'detached' })
  assert.equal(
    await history
      .getByRole('button', { name: '대화 a 대화 삭제', exact: true })
      .evaluate((button) => button === document.activeElement),
    true,
  )
  assert.deepEqual(state.deletes, [])
  assert.equal(await history.locator('.history-item').count(), 2)
})

scenario(
  '확인 모달은 취소에 먼저 포커스하고 Esc로 닫으면 삭제 버튼에 포커스를 돌려준다',
  { items: [{ ...summary('a'), title: '강남역 근처 매장 찾아줘' }] },
  async ({ page, history, state }) => {
    const trigger = history.getByRole('button', {
      name: '강남역 근처 매장 찾아줘 대화 삭제',
      exact: true,
    })
    await trigger.click()
    const dialog = page.getByRole('dialog', { name: '대화를 삭제할까요?' })
    await dialog.waitFor()
    assert.equal(
      await dialog
        .getByRole('button', { name: '취소' })
        .evaluate((button) => button === document.activeElement),
      true,
    )
    await page.keyboard.press('Tab')
    assert.equal(
      await dialog
        .getByRole('button', { name: '삭제', exact: true })
        .evaluate((button) => button === document.activeElement),
      true,
    )
    fs.mkdirSync(path.join(root, 'test-results'), { recursive: true })
    await page.screenshot({
      path: path.join(root, 'test-results/conversation-delete-dialog-desktop.png'),
    })
    await page.keyboard.press('Escape')
    await dialog.waitFor({ state: 'detached' })
    assert.equal(await trigger.evaluate((button) => button === document.activeElement), true)
    assert.deepEqual(state.deletes, [])
  },
)

scenario(
  '사람 상담 이력이 있는 대화에는 삭제 버튼을 표시하지 않는다',
  { items: [summary('a', true)] },
  async ({ history }) => {
    assert.equal(
      await history.getByRole('button', { name: '대화 a 대화 삭제', exact: true }).count(),
      0,
    )
    assert.equal(await history.getByText('상담 내역 포함').isVisible(), true)
  },
)

for (const [code, message] of [
  ['CONV-002', '답변 생성 중인 대화는 삭제할 수 없습니다.'],
  ['CONV-003', '사람 상담 이력이 있는 대화는 삭제할 수 없습니다.'],
]) {
  scenario(
    `서버 삭제 거절 ${code}: 이유를 표시하고 기존 대화를 유지한다`,
    { error: { status: 409, code, message } },
    async ({ page, history, state }) => {
      await history.getByTitle('대화 a', { exact: true }).click()
      await page.getByText('답변 a', { exact: true }).waitFor()
      await confirmDelete(page, history, 'a')
      const dialog = page.getByRole('dialog', { name: '대화를 삭제할까요?' })
      await dialog.getByRole('alert').waitFor()
      assert.equal(await dialog.getByRole('alert').textContent(), message)
      assert.equal(await page.getByText('답변 a', { exact: true }).isVisible(), true)
      assert.equal(await history.locator('.history-item').count(), 2)
      assert.deepEqual(state.deletes, ['a'])
    },
  )
}

scenario(
  '삭제 응답을 기다리는 동안 중복 삭제·전환·새 질문을 막는다',
  { holdDelete: true },
  async ({ page, history, state, release }) => {
    // 입력창은 포커스를 유지하려고 비활성화하지 않으므로, 질문을 입력해 둔 보내기 버튼이 막히는지 확인합니다.
    const heroForm = page.locator('form.ai-searchbox', { has: page.locator('#aiHeroInput') })
    const send = heroForm.getByRole('button', { name: '질문 보내기', exact: true })
    await page.locator('#aiHeroInput').fill('삭제 중 새 질문')
    assert.equal(await send.isDisabled(), false)
    await confirmDelete(page, history, 'a')
    const dialog = page.getByRole('dialog', { name: '대화를 삭제할까요?' })
    await page.waitForFunction(() => document.querySelector('.history-delete')?.disabled)
    assert.equal(await dialog.getByRole('button', { name: '취소' }).isDisabled(), true)
    await page.keyboard.press('Escape')
    assert.equal(await dialog.isVisible(), true)
    assert.equal(await history.getByTitle('대화 b', { exact: true }).isDisabled(), true)
    assert.equal(await page.locator('#newChat').isDisabled(), true)
    assert.equal(await send.isDisabled(), true)
    await history
      .getByRole('button', { name: '대화 a 대화 삭제', exact: true })
      .evaluate((button) => button.click())
    release()
    await history
      .getByRole('button', { name: '대화 a 대화 삭제', exact: true })
      .waitFor({ state: 'detached' })
    assert.deepEqual(state.deletes, ['a'])
  },
)

scenario(
  '두 페이지를 불러온 뒤 삭제해도 다음 목록에서 대화가 누락되지 않는다',
  { items: Array.from({ length: 41 }, (_, index) => summary(String(index + 1))) },
  async ({ page, history, state }) => {
    await history.getByRole('button', { name: '이전 대화 더 보기' }).click()
    await history.getByRole('button', { name: '대화 40 대화 삭제', exact: true }).waitFor()
    await confirmDelete(page, history, '1')
    await history
      .getByRole('button', { name: '대화 1 대화 삭제', exact: true })
      .waitFor({ state: 'detached' })
    await history.getByRole('button', { name: '이전 대화 더 보기' }).click()
    await history.getByRole('button', { name: '대화 41 대화 삭제', exact: true }).waitFor()
    assert.equal(await history.locator('.history-item').count(), 40)
    assert.deepEqual(state.deletes, ['1'])
    assert.equal(state.pages.at(-1), 1)
  },
)

scenario(
  '모바일 최근 대화에서도 삭제 후 목록을 갱신한다',
  { mobile: true },
  async ({ page, history, state }) => {
    fs.mkdirSync(path.join(root, 'test-results'), { recursive: true })
    await page.screenshot({ path: path.join(root, 'test-results/conversation-delete-mobile.png') })
    await history.getByRole('button', { name: '대화 b 대화 삭제', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: '대화를 삭제할까요?' })
    await dialog.waitFor()
    await page.screenshot({
      path: path.join(root, 'test-results/conversation-delete-dialog-mobile.png'),
    })
    await dialog.getByRole('button', { name: '삭제', exact: true }).click()
    await history
      .getByRole('button', { name: '대화 b 대화 삭제', exact: true })
      .waitFor({ state: 'detached' })
    assert.deepEqual(state.deletes, ['b'])
    assert.equal(await history.locator('.history-item').count(), 1)
  },
)
