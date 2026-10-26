const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const { startServer, launchBrowser } = require('./test-support/browser.cjs')
const { customerCounsel, counselId } = require('./test-support/customer-counsel.cjs')

let server, browser
before(async () => {
  server = await startServer(path.resolve(__dirname, '..'), 4194)
  browser = await launchBrowser()
})
after(async () => {
  await browser?.close()
  server?.close()
})

async function withCustomer(viewport, run) {
  const context = await browser.newContext({ viewport })
  const state = await customerCounsel(context)
  const page = await context.newPage()
  page.setDefaultTimeout(8000)
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  try {
    await page.goto(`${server.origin}/#/ai`)
    await page
      .locator('.ai-support-actions:visible')
      .getByRole('button', { name: '상담사 호출', exact: true })
      .click()
    await page.getByText('상담사를 기다리고 있어요', { exact: true }).waitFor()
    await run({ page, state })
    assert.deepEqual(errors, [])
  } finally {
    await context.close()
  }
}

test('상담 대기를 유지하며 기존 AI·상담 기록과 새 대화를 이용하고 연결 후 돌아온다', async () => {
  await withCustomer({ width: 1440, height: 960 }, async ({ page, state }) => {
    const history = page.locator('.ai-left')
    await history.getByTitle('기존 요금제 문의', { exact: true }).click()
    await page.getByText('기존 AI 답변입니다.', { exact: true }).waitFor()
    await page.locator('.counsel-resume').waitFor()
    assert.equal(state.ends, 0)
    assert.equal(state.current.status, 'WAITING')
    await history.getByTitle('지난 상담', { exact: true }).click()
    await page.getByText('지난 상담 답변입니다.', { exact: true }).waitFor()
    await history.getByRole('button', { name: '＋ 새 대화', exact: true }).click()
    const input = page.locator('#aiHeroInput')
    await input.fill('대기 중 별도의 AI 질문')
    await page.getByRole('button', { name: '질문 보내기', exact: true }).click()
    await page.getByText('검증용 AI 답변입니다.', { exact: true }).waitFor()
    const question = state.aiRequests.find((request) => request.path === '/api/chat/questions')
    assert.notEqual(question.body.conversationId, counselId)
    state.current = { ...state.current, status: 'ACTIVE' }
    await page
      .locator('.counsel-resume')
      .getByText('상담사와 연결되었어요', { exact: true })
      .waitFor()
    assert.equal(
      await page.locator('.ai-counsel-session').count(),
      0,
      'connection must not replace the AI conversation being read',
    )
    await page
      .locator('.counsel-resume')
      .getByRole('button', { name: '상담 보기', exact: true })
      .click()
    await page.locator('.ai-counsel-session').waitFor()
    assert.equal(await page.locator('#counsel-message').isEnabled(), true)
    assert.equal(state.requests.length, 1)
    assert.equal(state.ends, 0)
    assert.equal(state.requests[0].conversationId, null)
    await page.getByRole('button', { name: '상담 종료', exact: true }).click()
    await page.getByText('상담이 종료되었어요', { exact: true }).waitFor()
  })
})

for (const width of [1440, 768, 390, 320]) {
  test(`대기·연결 상태는 같은 채팅 틀과 고정 안내를 사용하고 전송 버튼을 가리지 않는다 (${width}px)`, async () => {
    await withCustomer({ width, height: 844 }, async ({ page, state }) => {
      const frame = page.locator('.ai-app')
      const before = await frame.boundingBox()
      const notice = page.getByText('상담사에게 현재 채팅창 메세지를 전달합니다.', { exact: true })
      await notice.waitFor()
      assert.equal(await page.getByText('전달된 메시지가 없습니다.', { exact: true }).count(), 0)
      const cancel = page.getByRole('button', { name: '대기 취소', exact: true })
      assert.equal(await cancel.evaluate((e) => getComputedStyle(e).borderRadius), '999px')
      await page.getByRole('button', { name: '다른 대화 이용', exact: true }).click()
      await page.locator('.counsel-resume').waitFor()
      assert.equal(state.ends, 0)
      await page
        .locator('.counsel-resume')
        .getByRole('button', { name: '상담 보기', exact: true })
        .click()
      await page.locator('.ai-counsel-session').waitFor()
      state.current = { ...state.current, status: 'ACTIVE' }
      await page.getByText('상담사와 연결되었어요', { exact: true }).waitFor()
      await notice.waitFor()
      const after = await frame.boundingBox()
      assert.deepEqual(
        after,
        before,
        'outer chat frame must stay stable when the counselor connects',
      )
      const send = page.getByRole('button', { name: '메시지 전송', exact: true })
      const sendBox = await send.boundingBox()
      assert.ok(sendBox.y + sendBox.height <= 844)
      assert.equal(
        await send.evaluate((e) => {
          const rect = e.getBoundingClientRect()
          return e.contains(
            document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2),
          )
        }),
        true,
        'the mascot or navigation must not cover the composer',
      )
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        true,
      )
      assert.equal(await page.locator('.ai-channel-label').innerText(), '상담사 채팅')
    })
  })
}

test('대기 취소는 서버에 한 번만 요청하고 새 대화를 계속 이용할 수 있다', async () => {
  await withCustomer({ width: 1280, height: 960 }, async ({ page, state }) => {
    await page.getByRole('button', { name: '대기 취소', exact: true }).click()
    await page.getByText('상담이 종료되었어요', { exact: true }).waitFor()
    assert.equal(state.ends, 1)
    await page.locator('.ai-left').getByRole('button', { name: '＋ 새 대화', exact: true }).click()
    await page.locator('#aiHeroInput').waitFor()
    assert.equal(await page.locator('.counsel-resume').count(), 0)
  })
})
