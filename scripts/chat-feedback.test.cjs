const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const net = require('node:net')
const { startServer, launchBrowser } = require('./test-support/browser.cjs')
const { installFixtures } = require('./test-support/fixtures.cjs')
const root = path.resolve(__dirname, '..')
const output = path.join(root, 'test-results')
const results = []
let server, browser

before(async () => {
  const probe = net.createServer()
  await new Promise((resolve) => probe.listen(0, '127.0.0.1', resolve))
  const port = probe.address().port
  await new Promise((resolve) => probe.close(resolve))
  server = await startServer(root, port)
  browser = await launchBrowser()
  fs.mkdirSync(output, { recursive: true })
})

after(async () => {
  await browser?.close()
  server?.close()
  fs.writeFileSync(path.join(output, 'chat-feedback.json'), JSON.stringify(results, null, 2))
})

function scenario(name, options, check) {
  test(name, { timeout: 25000 }, async () => {
    const context = await browser.newContext({
      viewport: options.mobile ? { width: 390, height: 844 } : { width: 1366, height: 960 },
      locale: 'ko-KR',
    })
    const fixtures = await installFixtures(context, options.guest ? null : 'USER')
    const page = await context.newPage()
    page.setDefaultTimeout(10000)
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    const posts = []
    const jobs = new Map()
    let submissions = 0
    let release
    const held = new Promise((resolve) => {
      release = resolve
    })
    const ok = (route, data, status = 200) =>
      route.fulfill({ status, json: { success: true, data } })
    const submitJob = async (route, research = false) => {
      const id = research ? 100 + submissions : ++submissions
      jobs.set(id, {
        jobId: id,
        status: options.pending ? 'RUNNING' : options.guard ? 'FAILED' : 'SUCCEEDED',
        phase: 'GENERATING',
        answer: research ? '재검색한 내 정보 안내' : (options.answer ?? `정상 답변 ${id}`),
        idempotencyKey: `feedback-key-${id}`,
        attemptCount: 1,
        retryable: false,
        ...(options.guard
          ? { errorCode: 'LLM-006', errorMessage: '검사 후 제공할 수 있는 답변이 없습니다.' }
          : {}),
      })
      return ok(
        route,
        {
          jobId: id,
          status: 'QUEUED',
          idempotencyKey: `feedback-key-${id}`,
          attemptCount: 1,
          conversationId: 'feedback-conversation',
        },
        202,
      )
    }
    await context.route('**/api/chat/questions', (route) => submitJob(route))
    await context.route('**/api/chat/questions/research', (route) => submitJob(route, true))
    await context.route('**/api/chat/jobs/*', (route) => {
      const id = Number(new URL(route.request().url()).pathname.split('/').pop())
      return ok(route, jobs.get(id))
    })
    await context.route('**/api/inquiries', async (route) => {
      posts.push(route.request().postDataJSON())
      if (options.failFirst && posts.length === 1)
        return route.fulfill({ status: 503, json: { success: false, message: '의견 접수 실패' } })
      if (options.hold) await held
      return route.fallback()
    })
    const ask = async (question) => {
      const input = page.getByRole('textbox', { name: 'AI 채팅 입력' }).first()
      await input.fill(question)
      await input.press('Enter')
      if (options.guard) await page.locator('.error-card').waitFor()
      else if (options.pending)
        await page.getByText('답변을 생성하고 있습니다.', { exact: true }).waitFor()
      else await page.getByRole('group', { name: '답변 의견', exact: true }).last().waitFor()
    }
    const thumbs = () => page.getByRole('group', { name: '답변 의견', exact: true })
    const dialog = () => page.getByRole('dialog', { name: '의견 보내기', exact: true })
    const save = async (name) => page.screenshot({ path: path.join(output, name), fullPage: true })
    try {
      await page.goto(server.origin + '/#/ai')
      await ask('요금제 변경 방법을 알려주세요')
      await check({ page, posts, fixtures, ask, thumbs, dialog, release, save })
      assert.deepEqual(errors, [])
      assert.deepEqual(fixtures.unknown, [])
      for (const body of posts) {
        assert.deepEqual(Object.keys(body).sort(), ['content', 'title'])
        assert.ok(body.title.length <= 200 && body.content.length <= 1000)
      }
      results.push({ name, passed: true, posts: posts.length })
    } catch (error) {
      results.push({ name, passed: false, error: error.message })
      throw error
    } finally {
      release()
      await context.close()
    }
  })
}

scenario(
  '좋아요는 제출 전 전송하지 않고 사유와 의견을 고객문의로 한 번 보낸다',
  {},
  async ({ page, posts, fixtures, thumbs, dialog, save }) => {
    await thumbs().getByRole('button', { name: '이 답변 좋아요', exact: true }).click()
    assert.equal(
      await dialog().getByRole('button', { name: '제출', exact: true }).isEnabled(),
      false,
    )
    assert.equal(posts.length, 0)
    await dialog()
      .getByRole('button', { name: /질문 해결에 도움이 돼요/ })
      .click()
    await dialog()
      .getByLabel('세부 내용', { exact: false })
      .fill('변경 방법을 쉽게 알 수 있었어요.')
    await save('feedback-positive.png')
    await dialog().getByRole('button', { name: '제출', exact: true }).click()
    await page.getByText('의견을 보냈어요.', { exact: false }).waitFor()
    assert.equal(posts.length, 1)
    assert.match(posts[0].title, /AI 답변 의견 · 좋아요/)
    for (const value of [
      '질문 해결에 도움이 돼요',
      '변경 방법을 쉽게 알 수 있었어요.',
      '정상 답변 1',
      'feedback-key-1',
    ])
      assert.ok(posts[0].content.includes(value))
    assert.equal(fixtures.state.inquiry.title, posts[0].title)
    assert.equal(fixtures.state.inquiry.content, posts[0].content)
    assert.equal(
      await thumbs().getByRole('button', { name: '이 답변 좋아요', exact: true }).isEnabled(),
      false,
    )
  },
)

scenario(
  '별로예요의 자유 의견만으로도 화면에 표시한 답변을 보내며 원본 JSON은 보내지 않는다',
  {
    answer: JSON.stringify({ answer: '화면에서 확인한 답변', internal: 'DO-NOT-SEND-RAW-JSON' }),
  },
  async ({ page, posts, thumbs, dialog, save }) => {
    await thumbs().getByRole('button', { name: '이 답변 별로예요', exact: true }).click()
    await dialog().getByLabel('세부 내용', { exact: false }).fill('질문과 다른 내용을 설명했어요.')
    await save('feedback-negative.png')
    await dialog().getByRole('button', { name: '제출', exact: true }).click()
    await page.getByText('의견을 보냈어요.', { exact: false }).waitFor()
    assert.match(posts[0].title, /별로예요/)
    assert.ok(posts[0].content.includes('화면에서 확인한 답변'))
    assert.ok(!posts[0].content.includes('DO-NOT-SEND-RAW-JSON'))
  },
)

scenario(
  '여러 답변 중 선택한 답변만 연결하고 다른 답변의 의견 버튼은 유지한다',
  {},
  async ({ page, posts, ask, thumbs, dialog }) => {
    await ask('두 번째 질문입니다')
    await thumbs().nth(1).getByRole('button', { name: '이 답변 별로예요', exact: true }).click()
    await dialog()
      .getByRole('button', { name: /필요한 내용이 빠졌어요/ })
      .click()
    await dialog().getByRole('button', { name: '제출', exact: true }).click()
    await page.getByText('의견을 보냈어요.', { exact: false }).waitFor()
    assert.ok(posts[0].content.includes('두 번째 질문입니다'))
    assert.ok(posts[0].content.includes('정상 답변 2'))
    assert.ok(!posts[0].content.includes('정상 답변 1'))
    assert.equal(
      await thumbs()
        .first()
        .getByRole('button', { name: '이 답변 좋아요', exact: true })
        .isEnabled(),
      true,
    )
  },
)

scenario(
  '전송 실패를 성공으로 표시하지 않고 작성 내용을 유지한 채 다시 제출할 수 있다',
  { failFirst: true },
  async ({ page, posts, thumbs, dialog }) => {
    await thumbs().getByRole('button', { name: '이 답변 별로예요', exact: true }).click()
    await dialog()
      .getByRole('button', { name: /답변이 정확하지 않아요/ })
      .click()
    await dialog().getByLabel('세부 내용', { exact: false }).fill('확인이 필요합니다.')
    await dialog().getByRole('button', { name: '제출', exact: true }).click()
    await dialog().getByRole('alert').waitFor()
    assert.equal(await page.getByText('의견을 보냈어요.', { exact: false }).count(), 0)
    assert.equal(
      await dialog().getByLabel('세부 내용', { exact: false }).inputValue(),
      '확인이 필요합니다.',
    )
    await dialog().getByRole('button', { name: '제출', exact: true }).click()
    await page.getByText('의견을 보냈어요.', { exact: false }).waitFor()
    assert.equal(posts.length, 2)
    assert.deepEqual(posts[0], posts[1])
  },
)

scenario(
  '전송 중 연속 클릭은 하나의 고객문의만 만든다',
  { hold: true },
  async ({ page, posts, thumbs, dialog, release }) => {
    await thumbs().getByRole('button', { name: '이 답변 좋아요', exact: true }).click()
    await dialog()
      .getByRole('button', { name: /안내가 정확해요/ })
      .click()
    await dialog().getByRole('button', { name: '제출', exact: true }).dblclick()
    await dialog().getByRole('button', { name: '보내는 중…', exact: true }).waitFor()
    assert.equal(posts.length, 1)
    release()
    await page.getByText('의견을 보냈어요.', { exact: false }).waitFor()
    assert.equal(posts.length, 1)
  },
)

scenario(
  '비회원은 의견을 보내지 않고 기존 로그인 화면으로 이동한다',
  { guest: true },
  async ({ page, posts, thumbs, dialog }) => {
    await thumbs().getByRole('button', { name: '이 답변 별로예요', exact: true }).click()
    await dialog().getByRole('button', { name: '로그인하고 의견 보내기', exact: true }).click()
    await page.getByRole('heading', { name: 'UBot 로그인', exact: true }).waitFor()
    assert.equal(posts.length, 0)
  },
)

scenario(
  '생성 중인 답변에는 평가 버튼을 표시하지 않는다',
  { pending: true },
  async ({ thumbs, posts }) => {
    assert.equal(await thumbs().count(), 0)
    assert.equal(posts.length, 0)
  },
)

scenario(
  '출력 가드가 거절한 답변에는 평가 버튼을 표시하지 않는다',
  { guard: true },
  async ({ thumbs, posts }) => {
    assert.equal(await thumbs().count(), 0)
    assert.equal(posts.length, 0)
  },
)

scenario(
  '재검색 답변도 원래 답변과 구분해 선택한 내용과 의도를 보낸다',
  {},
  async ({ page, posts, thumbs, dialog }) => {
    await page
      .getByRole('group', { name: '질문 의도 선택', exact: true })
      .getByRole('button', { name: '내 정보 확인', exact: true })
      .click()
    await page.getByText('재검색한 내 정보 안내', { exact: true }).waitFor()
    assert.equal(await thumbs().count(), 2)
    await thumbs().nth(1).getByRole('button', { name: '이 답변 좋아요', exact: true }).click()
    await dialog()
      .getByRole('button', { name: /필요한 정보가 있어요/ })
      .click()
    await dialog().getByRole('button', { name: '제출', exact: true }).click()
    await page.getByText('의견을 보냈어요.', { exact: false }).waitFor()
    assert.ok(posts[0].content.includes('내 정보 확인 재검색 답변'))
    assert.ok(posts[0].content.includes('재검색한 내 정보 안내'))
    assert.ok(!posts[0].content.includes('정상 답변 1'))
  },
)

scenario(
  '작은 화면에서도 모달이 넘치지 않고 키보드 이동·Escape·포커스 복귀가 동작한다',
  { mobile: true },
  async ({ page, thumbs, dialog, save }) => {
    const opener = thumbs().getByRole('button', { name: '이 답변 별로예요', exact: true })
    await opener.click()
    await dialog()
      .getByRole('button', { name: /부적절한 표현이 있어요/ })
      .click()
    const close = dialog().getByRole('button', { name: '의견 창 닫기', exact: true })
    await close.focus()
    await page.keyboard.press('Shift+Tab')
    assert.equal(
      await dialog()
        .getByRole('button', { name: '제출', exact: true })
        .evaluate((el) => el === document.activeElement),
      true,
    )
    await page.keyboard.press('Tab')
    assert.equal(await close.evaluate((el) => el === document.activeElement), true)
    const box = await dialog().boundingBox()
    assert.ok(box.x >= 0 && box.x + box.width <= 390 && box.height <= 844)
    await save('feedback-mobile.png')
    await page.keyboard.press('Escape')
    assert.equal(await dialog().count(), 0)
    assert.equal(await opener.evaluate((el) => el === document.activeElement), true)
  },
)

scenario(
  '긴 답변의 첨부 제한을 알리고 세부 의견을 보존해 전송한다',
  { answer: '안내😀'.repeat(2000) },
  async ({ page, posts, thumbs, dialog }) => {
    await thumbs().getByRole('button', { name: '이 답변 별로예요', exact: true }).click()
    await dialog().getByLabel('세부 내용', { exact: false }).fill('의견'.repeat(150))
    await dialog().getByText('긴 질문·답변은 일부만 첨부돼요.', { exact: false }).waitFor()
    await dialog().getByRole('button', { name: '제출', exact: true }).click()
    await page.getByText('의견을 보냈어요.', { exact: false }).waitFor()
    assert.ok(posts[0].content.includes('의견'.repeat(150)))
    assert.ok(posts[0].content.isWellFormed())
  },
)
