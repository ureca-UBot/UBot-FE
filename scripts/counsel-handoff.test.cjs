const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const { startServer, launchBrowser } = require('./test-support/browser.cjs')
const { customerCounsel, aiId, archiveId } = require('./test-support/customer-counsel.cjs')
const { faq } = require('./test-support/fixtures.cjs')

let server, browser
before(async () => {
  server = await startServer(path.resolve(__dirname, '..'), 4198)
  browser = await launchBrowser()
})
after(async () => {
  await browser?.close()
  server?.close()
})

const callButton = (page) =>
  page
    .locator('.ai-support-actions:visible')
    .getByRole('button', { name: /상담사 호출|상담 요청 확인/ })

async function fixture(run) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } })
  const state = await customerCounsel(context)
  const page = await context.newPage()
  page.setDefaultTimeout(10000)
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  try {
    await run({ context, state, page })
    assert.deepEqual(errors, [])
  } catch (error) {
    console.error(await page.locator('body').innerText(), errors)
    throw error
  } finally {
    await context.close()
  }
}

test('현재 대화의 AI·FAQ를 인계하고 종료 후 추가한 문답도 새로고침·재로그인 후 같은 대화로 재인계한다', async () => {
  await fixture(async ({ context, state, page }) => {
    // 서버 저장본과 응답을 대역으로 제공해 브라우저의 요청 계약과 화면 전환을 검증합니다.
    // 실제 DB 이력 합성·소유권 검증은 BE CounselIntegrationTest에서 검증합니다.
    const saved = [
      { role: 'USER', content: '어떤 요금제가 좋을까요?', source: 'SAVED' },
      { role: 'AI', content: '기존 AI 답변입니다.', source: 'SAVED' },
    ]
    let snapshot = [],
      job = 0,
      selections = 0
    const ok = (route, data) => route.fulfill({ json: { success: true, data } })
    await context.route('**/api/conversations/faq-selections', async (route) => {
      const body = route.request().postDataJSON()
      assert.equal(body.conversationId, aiId)
      selections++
      saved.push(
        { role: 'USER', content: faq.question, source: 'SAVED' },
        { role: 'AI', content: `서버 FAQ 답변 ${selections}`, source: 'SAVED' },
      )
      return ok(route, { ...body, question: faq.question, answer: `서버 FAQ 답변 ${selections}` })
    })
    await context.route('**/api/chat/questions', async (route) => {
      const body = route.request().postDataJSON()
      assert.equal(body.conversationId, aiId)
      job++
      saved.push(
        { role: 'USER', content: body.question, source: 'SAVED' },
        { role: 'AI', content: '종료 후 AI 답변', source: 'SAVED' },
      )
      return ok(route, {
        jobId: job,
        conversationId: aiId,
        status: 'QUEUED',
        attemptCount: 1,
        idempotencyKey: 'continued-question',
      })
    })
    await context.route('**/api/chat/jobs/*', (route) =>
      ok(route, {
        jobId: job,
        status: 'SUCCEEDED',
        answer: '종료 후 AI 답변',
        attemptCount: 1,
        idempotencyKey: 'continued-question',
        retryable: false,
      }),
    )
    await context.route('**/api/conversations/*/timeline?**', (route) =>
      ok(route, {
        items: saved.map((item, index) => ({ ...item, id: `saved:${index}`, sequence: index + 1 })),
        hasNext: false,
        nextCursor: null,
      }),
    )
    await context.route('**/api/counsel/sessions/*/context?**', (route) => ok(route, snapshot))
    await context.route('**/api/counsel/requests', async (route) => {
      const body = route.request().postDataJSON()
      state.requests.push(body)
      assert.equal(body.conversationId, aiId)
      assert.deepEqual(Object.keys(body).sort(), ['conversationId', 'handoffId'])
      snapshot = saved.map((item, index) => ({ ...item, sequence: index + 1 }))
      state.current = {
        sessionId: `20000000-0000-0000-0000-${String(state.requests.length).padStart(12, '0')}`,
        conversationId: body.conversationId,
        status: 'ACTIVE',
        assignmentVersion: 1,
        lastDeliveredSeq: 0,
      }
      return ok(route, state.current)
    })

    await page.goto(`${server.origin}/#/ai`)
    await page.locator('.ai-left').getByTitle('기존 요금제 문의', { exact: true }).click()
    await page.getByText('기존 AI 답변입니다.', { exact: true }).waitFor()
    await page.locator('.ranking-sidebar').getByTitle(faq.question, { exact: true }).click()
    await page.getByText('서버 FAQ 답변 1', { exact: true }).waitFor()
    await callButton(page).click()
    await page.getByText('상담사와 연결되었어요', { exact: true }).waitFor()
    const history = page.locator('.counsel-history-message')
    await history.filter({ hasText: '기존 AI 답변입니다.' }).waitFor()
    await history.filter({ hasText: '서버 FAQ 답변 1' }).waitFor()
    const firstRequest = state.requests[0]

    saved.push({ role: 'COUNSELOR', content: '이전 상담사 안내', source: 'COUNSEL' })
    await page.getByRole('button', { name: '상담 종료', exact: true }).click()
    await page.getByText('상담이 종료되었어요', { exact: true }).waitFor()
    await page.locator('#aiContinuedInput').fill('종료 후 AI 질문')
    await page.getByRole('button', { name: '질문 보내기', exact: true }).click()
    await page.getByText('종료 후 AI 답변', { exact: true }).waitFor()
    await page.locator('.ranking-sidebar').getByTitle(faq.question, { exact: true }).click()
    await page.getByText('서버 FAQ 답변 2', { exact: true }).waitFor()

    await page.reload()
    await page.getByText('상담이 종료되었어요', { exact: true }).waitFor()
    // 새로고침 직후에는 ChatProvider의 대화 ID가 없으므로 복원한 상담의 대화 ID를 사용합니다.
    await callButton(page).click()
    await history.filter({ hasText: '종료 후 AI 답변' }).waitFor()
    await history.filter({ hasText: '서버 FAQ 답변 2' }).waitFor()
    await history.filter({ hasText: '이전 상담사 안내' }).waitFor()
    assert.equal(state.requests[1].conversationId, firstRequest.conversationId)
    assert.notEqual(state.requests[1].handoffId, firstRequest.handoffId)

    await page.getByRole('button', { name: '상담 종료', exact: true }).click()
    await page.getByText('상담이 종료되었어요', { exact: true }).waitFor()
    await page.getByRole('button', { name: '로그아웃', exact: true }).click()
    await page.getByRole('button', { name: '로그인', exact: true }).first().click()
    await page.getByLabel('이메일', { exact: true }).fill('handoff@example.test')
    await page.getByLabel('비밀번호', { exact: true }).fill('fixture-password')
    await page.locator('.auth-form').getByRole('button', { name: '로그인', exact: true }).click()
    await page.locator('.ai-left').getByTitle('기존 요금제 문의', { exact: true }).click()
    await page.getByText('상담이 종료되었어요', { exact: true }).waitFor()
    await callButton(page).click()
    await history.filter({ hasText: '서버 FAQ 답변 2' }).waitFor()
    await history.filter({ hasText: '종료 후 AI 답변' }).waitFor()
    assert.equal(state.requests.length, 3)
    assert.equal(state.requests[2].conversationId, aiId)
  })
})

test('종료된 상담과 다른 대화를 선택하면 현재 선택한 대화를 인계한다', async () => {
  await fixture(async ({ state, page }) => {
    await page.goto(`${server.origin}/#/ai`)
    await page.locator('.ai-left').getByTitle('지난 상담', { exact: true }).click()
    await page.getByText('상담이 종료되었어요', { exact: true }).waitFor()
    await page.locator('.ai-left').getByTitle('기존 요금제 문의', { exact: true }).click()
    await page.getByText('기존 AI 답변입니다.', { exact: true }).waitFor()
    await callButton(page).click()
    await page.getByText('상담사를 기다리고 있어요', { exact: true }).waitFor()
    assert.equal(state.requests[0].conversationId, aiId)
    assert.notEqual(state.requests[0].conversationId, archiveId)
  })
})

test('응답 유실 후 재시도는 대화 ID와 요청 ID를 유지하고 화면 본문을 보내지 않는다', async () => {
  await fixture(async ({ context, state, page }) => {
    const attempts = []
    await context.route('**/api/counsel/requests', async (route) => {
      attempts.push(route.request().postDataJSON())
      if (attempts.length === 1)
        return route.fulfill({ status: 503, json: { success: false, message: '일시적인 오류' } })
      return route.fallback()
    })
    await page.goto(`${server.origin}/#/ai`)
    await page.locator('.ai-left').getByTitle('기존 요금제 문의', { exact: true }).click()
    await page.getByText('기존 AI 답변입니다.', { exact: true }).waitFor()
    await callButton(page).click()
    await page.getByText('일시적인 오류', { exact: true }).waitFor()
    await callButton(page).click()
    await page.getByText('상담사를 기다리고 있어요', { exact: true }).waitFor()
    assert.equal(state.requests.length, 1)
    assert.deepEqual(attempts[0], attempts[1])
    assert.deepEqual(Object.keys(attempts[0]).sort(), ['conversationId', 'handoffId'])
    assert.equal(attempts[0].conversationId, aiId)
  })
})
