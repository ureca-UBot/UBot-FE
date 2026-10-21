const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const fs = require('node:fs')
const base = path.resolve(__dirname, '..')
const { startServer, launchBrowser } = require('./test-support/browser.cjs')
const { installFixtures } = require('./test-support/fixtures.cjs')
const key = 'retry-test-key'
const rows = []
let browser
before(async () => {
  browser = await launchBrowser()
})
after(async () => {
  await browser?.close()
  fs.mkdirSync(path.join(base, 'test-results'), { recursive: true })
  fs.writeFileSync(path.join(base, 'test-results/chat-retry.json'), JSON.stringify(rows, null, 2))
})
const failure = (attempt, options = {}) => ({
  jobId: attempt,
  status: 'FAILED',
  answer: null,
  attemptCount: attempt,
  errorCode: 'LLM-001',
  errorMessage: '검증용 일시 오류',
  retryable: attempt < 3,
  idempotencyKey: key,
  ...options,
})
const success = (attempt, options = {}) => ({
  jobId: attempt,
  status: 'SUCCEEDED',
  answer: '정상 답변 확인 완료',
  attemptCount: attempt,
  retryable: false,
  idempotencyKey: key,
  ...options,
})
const userData = {
  plans: [],
  usages: [],
  billings: [
    {
      phoneNumber: '010-****-1234',
      usageMonth: 9,
      billing: {
        billingMonth: '2026-10',
        baseFee: 55000,
        addonFee: 0,
        roamingFee: 0,
        extraFee: 0,
        discountAmount: 11000,
        totalAmount: 44000,
        dueDate: '2026-10-25',
        paymentStatus: 'UNPAID',
        paidAmount: 0,
        paymentMethod: 'CARD',
        paidAt: null,
      },
    },
  ],
}

const cases = [
  { name: '첫 성공은 재시도하지 않는다', states: [success(1)], calls: 1, succeeded: true },
  {
    name: '첫 실패 후 성공하면 같은 키로 한 번만 재시도한다',
    states: [failure(1), success(2)],
    calls: 2,
    succeeded: true,
  },
  {
    name: '반복 실패는 최초 포함 총 3회에서 종료한다',
    states: [failure(1), failure(2), failure(3)],
    calls: 3,
  },
  {
    name: '출력 가드 거절은 재시도하지 않는다',
    states: [
      failure(1, {
        errorCode: 'LLM-006',
        errorMessage: '검사 후 제공할 수 있는 답변이 없습니다.',
        retryable: false,
      }),
    ],
    calls: 1,
  },
  {
    name: '재시도 중 출력 가드 거절이 오면 즉시 종료한다',
    states: [
      failure(1),
      failure(2, {
        errorCode: 'LLM-006',
        errorMessage: '검사 후 제공할 수 있는 답변이 없습니다.',
        retryable: false,
      }),
    ],
    calls: 2,
  },
  {
    name: '기타 재시도 불가 실패는 한 번에서 종료한다',
    states: [failure(1, { retryable: false, errorCode: 'CHAT-022' })],
    calls: 1,
  },
  {
    name: '멱등키가 없으면 새 요청을 만들지 않는다',
    states: [failure(1, { idempotencyKey: null })],
    calls: 1,
  },
  { name: '시도 횟수가 잘못됐으면 자동 반복하지 않는다', states: [failure(0)], calls: 1 },
  {
    name: '서버가 재시도 가능이라 해도 총 3회에 도달하면 종료한다',
    states: [failure(3, { retryable: true })],
    calls: 1,
  },
  {
    name: '접수 응답 없는 통신 실패는 새 답변을 중복 생성하지 않는다',
    createError: true,
    states: [],
    calls: 1,
  },
  {
    name: '재시도 접수 실패 뒤 추가 요청을 반복하지 않는다',
    states: [failure(1)],
    retryError: true,
    calls: 2,
  },
]

test('자동 재시도 계약', { timeout: 150000 }, async (group) => {
  const server = await startServer(base, 4197)
  try {
    for (const item of cases) {
      await group.test(item.name, { timeout: 14000 }, async () => {
        const context = await browser.newContext()
        const fixtures = await installFixtures(context, 'USER')
        const calls = [],
          keys = [],
          polls = []
        let result
        try {
          await context.route('**/api/chat/questions**', async (route) => {
            const p = new URL(route.request().url()).pathname
            if (!['/api/chat/questions', '/api/chat/questions/retries'].includes(p))
              return route.fallback()
            calls.push(p)
            keys.push(route.request().headers()['idempotency-key'] ?? null)
            if (item.createError || (item.retryError && calls.length > 1))
              return route.fulfill({
                status: 503,
                json: { success: false, code: 'SERVER-001', message: '검증용 통신 오류' },
              })
            const number = calls.length
            return route.fulfill({
              status: 202,
              json: {
                success: true,
                data: {
                  jobId: number,
                  status: 'QUEUED',
                  conversationId: 'conversation-test',
                  idempotencyKey: key,
                  attemptCount: number,
                },
              },
            })
          })
          await context.route('**/api/chat/jobs/*', async (route) => {
            const number = Number(new URL(route.request().url()).pathname.split('/').pop())
            polls.push(number)
            const state = item.states[number - 1]
            assert.ok(state, 'Unexpected extra job poll')
            return route.fulfill({ json: { success: true, data: state } })
          })
          const page = await context.newPage()
          const errors = []
          page.on('pageerror', (error) => errors.push(error.message))
          page.setDefaultTimeout(10000)
          await page.goto(server.origin + '/#/ai')
          const input = page.getByRole('textbox', { name: 'AI 채팅 입력' }).first()
          await input.fill('요금제 변경 방법을 알려주세요')
          await input.press('Enter')
          if (item.succeeded) await page.getByText('정상 답변 확인 완료', { exact: true }).waitFor()
          else await page.getByRole('heading', { name: '답변을 완료하지 못했습니다.' }).waitFor()
          await page.waitForTimeout(120)
          assert.equal(calls.length, item.calls)
          assert.equal(
            await page.getByRole('button', { name: '답변 재시도', exact: true }).count(),
            0,
          )
          assert.deepEqual(keys.slice(1), Array(Math.max(0, calls.length - 1)).fill(key))
          assert.deepEqual(errors, [])
          assert.deepEqual(fixtures.unknown, [])
          result = {
            name: item.name,
            passed: true,
            create_calls: 1,
            retry_calls: calls.length - 1,
            polls,
          }
        } catch (error) {
          result = { name: item.name, passed: false, error: error.message, calls, polls }
          throw error
        } finally {
          rows.push(result)
          await context.close()
        }
      })
    }
    await group.test('재시도 성공 후 팀원의 청구 카드가 유지된다', { timeout: 14000 }, async () => {
      const context = await browser.newContext()
      const fixtures = await installFixtures(context, 'USER')
      let calls = 0
      try {
        await context.route('**/api/chat/questions**', async (route) => {
          calls++
          return route.fulfill({
            status: 202,
            json: {
              success: true,
              data: {
                jobId: calls,
                status: 'QUEUED',
                conversationId: 'cards-test',
                idempotencyKey: key,
                attemptCount: calls,
              },
            },
          })
        })
        await context.route('**/api/chat/jobs/*', async (route) => {
          const number = Number(new URL(route.request().url()).pathname.split('/').pop())
          return route.fulfill({
            json: { success: true, data: number === 1 ? failure(1) : success(2, { userData }) },
          })
        })
        const page = await context.newPage()
        await page.goto(server.origin + '/#/ai')
        const input = page.getByRole('textbox', { name: 'AI 채팅 입력' }).first()
        await input.fill('이번 달 청구서를 알려주세요')
        await input.press('Enter')
        await page.locator('.chat-user-data').waitFor({ timeout: 10000 })
        assert.equal(calls, 2)
        assert.match(await page.locator('.chat-user-data').innerText(), /44,000/)
        assert.match(await page.locator('.chat-user-data').innerText(), /010-\*\*\*\*-1234/)
        assert.deepEqual(fixtures.unknown, [])
        fs.mkdirSync(path.join(base, 'test-results'), { recursive: true })
        await page.screenshot({
          path: path.join(base, 'test-results/retry-with-team-billing-card.png'),
          fullPage: true,
        })
        rows.push({ name: '재시도 성공 후 팀원 청구 카드 보존', passed: true, retry_calls: 1 })
      } finally {
        await context.close()
      }
    })

    await group.test(
      '팀원 진행 단계 안내가 생성 완료까지 유지된다',
      { timeout: 20000 },
      async () => {
        const context = await browser.newContext()
        const fixtures = await installFixtures(context, 'USER')
        const phases = ['SEARCHING', 'COLLECTING_CONTEXT', 'WAITING_FOR_MODEL', 'GENERATING']
        let polls = 0
        try {
          await context.route('**/api/chat/questions', (route) =>
            route.fulfill({
              status: 202,
              json: {
                success: true,
                data: {
                  jobId: 1,
                  status: 'QUEUED',
                  phase: 'WAITING',
                  conversationId: 'progress-test',
                  idempotencyKey: key,
                  attemptCount: 1,
                },
              },
            }),
          )
          await context.route('**/api/chat/jobs/1', (route) => {
            const phase = phases[polls++]
            return route.fulfill({
              json: {
                success: true,
                data: phase ? { ...success(1), status: 'RUNNING', phase } : success(1),
              },
            })
          })
          const page = await context.newPage()
          await page.goto(server.origin + '/#/ai')
          const input = page.getByRole('textbox', { name: 'AI 채팅 입력' }).first()
          await input.fill('요금제를 알려주세요')
          await input.press('Enter')
          for (const message of [
            '질문을 접수했습니다. 순서를 기다리고 있습니다.',
            '질문과 관련된 정보를 찾고 있습니다.',
            '답변에 필요한 정보를 확인하고 있습니다.',
            '답변 생성을 준비하고 있습니다.',
            '답변을 생성하고 있습니다.',
          ]) {
            await page.getByText(message, { exact: true }).waitFor({ timeout: 5000 })
          }
          await page.getByText('정상 답변 확인 완료', { exact: true }).waitFor()
          assert.deepEqual(fixtures.unknown, [])
          rows.push({ name: '팀원 진행 단계 안내 보존', passed: true, polls })
        } finally {
          await context.close()
        }
      },
    )
  } finally {
    server.close()
  }
})
