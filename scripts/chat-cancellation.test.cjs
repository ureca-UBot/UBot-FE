const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const fs = require('node:fs')
const root = path.resolve(__dirname, '..')
const { startServer, launchBrowser } = require(path.join(root, 'scripts/test-support/browser.cjs'))
const { installFixtures } = require(path.join(root, 'scripts/test-support/fixtures.cjs'))
const cases = []
let server, browser
before(async () => {
  server = await startServer(root, 4198)
  browser = await launchBrowser()
})
after(async () => {
  await browser?.close()
  server?.close()
  const resultDir = path.join(root, 'test-results')
  fs.mkdirSync(resultDir, { recursive: true })
  fs.writeFileSync(path.join(resultDir, 'chat-cancellation.json'), JSON.stringify(cases, null, 2))
})
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
async function until(condition) {
  const deadline = Date.now() + 9000
  while (!condition()) {
    assert.ok(Date.now() < deadline, 'Condition was not reached')
    await sleep(20)
  }
}
const gate = () => {
  let resolve
  const promise = new Promise((r) => {
    resolve = r
  })
  return { promise, resolve }
}
const running = (id) => ({
  jobId: id,
  status: 'RUNNING',
  phase: 'GENERATING',
  attemptCount: id,
  retryable: false,
  idempotencyKey: 'key',
})
const success = (id) => ({ ...running(id), status: 'SUCCEEDED', answer: '정상 완료된 답변' })

async function scenario(name, options, check) {
  await test(name, { timeout: 25000 }, async () => {
    const context = await browser.newContext()
    const fixtures = await installFixtures(context, 'USER')
    const page = await context.newPage()
    page.setDefaultTimeout(12000)
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    const state = { submissions: [], cancellations: [], polls: [], complete: false }
    const submissionGate = gate(),
      cancelGate = gate()
    try {
      await context.route('**/api/chat/questions**', async (route) => {
        const id = state.submissions.length + 1
        state.submissions.push(id)
        if (options.lateSubmission && id === 1) await submissionGate.promise
        return route.fulfill({
          status: 202,
          json: {
            success: true,
            data: {
              jobId: id,
              status: 'QUEUED',
              idempotencyKey: 'key',
              attemptCount: id,
              conversationId: 'cancel-test',
            },
          },
        })
      })
      await context.route('**/api/chat/jobs/*', async (route) => {
        const id = Number(new URL(route.request().url()).pathname.split('/').pop())
        state.polls.push(id)
        const data =
          options.retry && id === 1
            ? {
                ...running(id),
                status: 'FAILED',
                retryable: true,
                errorCode: 'LLM-001',
                errorMessage: '일시 오류',
              }
            : state.complete
              ? options.guardWins
                ? {
                    ...running(id),
                    status: 'FAILED',
                    retryable: false,
                    errorCode: 'LLM-006',
                    errorMessage: '검사 후 제공할 수 있는 답변이 없습니다.',
                  }
                : success(id)
              : running(id)
        return route.fulfill({ json: { success: true, data } })
      })
      await context.route('**/api/chat/jobs/*/cancel', async (route) => {
        const id = Number(new URL(route.request().url()).pathname.split('/').at(-2))
        state.cancellations.push(id)
        if (options.holdCancel) await cancelGate.promise
        if (options.failFirstCancel && state.cancellations.length === 1)
          return route.fulfill({
            status: 503,
            json: { success: false, code: 'TEST-503', message: '취소 확인 실패' },
          })
        if (options.completionWins || options.guardWins) state.complete = true
        return route.fulfill({
          json: {
            success: true,
            data: { jobId: id, cancelled: !(options.completionWins || options.guardWins) },
          },
        })
      })
      await page.goto(server.origin + '/#/ai')
      const input = page.getByRole('textbox', { name: 'AI 채팅 입력' }).first()
      await input.fill('요금제 변경 방법을 알려주세요')
      await input.press('Enter')
      await until(() => state.submissions.length >= 1)
      const stop = page.getByRole('button', { name: '답변 생성 중단', exact: true })
      await check({ page, stop, state, submissionGate, cancelGate })
      assert.deepEqual(errors, [])
      assert.deepEqual(fixtures.unknown, [])
      assert.equal(await page.getByRole('button', { name: '답변 재시도', exact: true }).count(), 0)
      cases.push({ name, passed: true, ...state })
    } catch (error) {
      cases.push({ name, passed: false, error: error.message, ...state })
      throw error
    } finally {
      submissionGate.resolve()
      cancelGate.resolve()
      await context.close()
    }
  })
}

scenario(
  '접수 전 중단은 늦게 도착한 작업 ID에 취소를 전달한다',
  { lateSubmission: true },
  async ({ page, stop, state, submissionGate }) => {
    await stop.click()
    await page.getByText('답변 중단을 요청하고 있습니다.', { exact: true }).waitFor()
    assert.equal(state.cancellations.length, 0)
    assert.equal(await page.getByText('답변 생성을 중단했습니다.', { exact: true }).count(), 0)
    submissionGate.resolve()
    await page.getByText('답변 생성을 중단했습니다.', { exact: true }).waitFor()
    assert.deepEqual(state.cancellations, [1])
    assert.deepEqual(state.polls, [])
  },
)

scenario(
  '생성 중 중단은 현재 작업 하나만 취소하고 재시도하지 않는다',
  {},
  async ({ page, stop, state }) => {
    await until(() => state.polls.length > 0)
    await stop.click()
    await page.getByText('답변 생성을 중단했습니다.', { exact: true }).waitFor()
    const polls = state.polls.length
    await sleep(1800)
    assert.deepEqual(state.cancellations, [1])
    assert.deepEqual(state.submissions, [1])
    assert.equal(state.polls.length, polls)
  },
)

scenario(
  '자동 재시도 중 중단은 새 시도의 작업 ID를 사용한다',
  { retry: true },
  async ({ page, stop, state }) => {
    await until(() => state.submissions.length === 2)
    await until(() => state.polls.includes(2))
    await stop.click()
    await page.getByText('답변 생성을 중단했습니다.', { exact: true }).waitFor()
    await sleep(200)
    assert.deepEqual(state.cancellations, [2])
    assert.deepEqual(state.submissions, [1, 2])
  },
)

scenario(
  '중단 버튼 연속 클릭은 같은 취소 요청을 중복 전송하지 않는다',
  { holdCancel: true },
  async ({ page, stop, state, cancelGate }) => {
    await until(() => state.polls.length > 0)
    await stop.click()
    await stop.click()
    await until(() => state.cancellations.length > 0)
    assert.equal(state.cancellations.length, 1)
    cancelGate.resolve()
    await page.getByText('답변 생성을 중단했습니다.', { exact: true }).waitFor()
  },
)

scenario(
  '취소 API 실패는 중단 완료로 표시하지 않고 다시 취소할 수 있다',
  { failFirstCancel: true },
  async ({ page, stop, state }) => {
    await until(() => state.polls.length > 0)
    await stop.click()
    await page.getByRole('alert').filter({ hasText: '중단 요청을 확인하지 못했습니다.' }).waitFor()
    assert.equal(await page.getByText('답변 생성을 중단했습니다.', { exact: true }).count(), 0)
    await stop.click()
    await page.getByText('답변 생성을 중단했습니다.', { exact: true }).waitFor()
    assert.deepEqual(state.cancellations, [1, 1])
    assert.deepEqual(state.submissions, [1])
  },
)

scenario(
  '완료가 먼저 확정되면 중단 표시 대신 기존 답변을 유지한다',
  { completionWins: true },
  async ({ page, stop, state }) => {
    await until(() => state.polls.length > 0)
    await stop.click()
    await page.getByText('정상 완료된 답변', { exact: true }).waitFor()
    assert.equal(await page.getByText('답변 생성을 중단했습니다.', { exact: true }).count(), 0)
    assert.deepEqual(state.submissions, [1])
  },
)

scenario(
  '출력 가드 거절은 중단 완료로 덮거나 재시도하지 않는다',
  { guardWins: true },
  async ({ page, stop, state }) => {
    await stop.click()
    await page.getByText('검사 후 제공할 수 있는 답변이 없습니다.', { exact: true }).waitFor()
    assert.equal(await page.getByText('답변 생성을 중단했습니다.', { exact: true }).count(), 0)
    assert.deepEqual(state.submissions, [1])
    assert.deepEqual(state.cancellations, [1])
  },
)
