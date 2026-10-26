const { chromium } = require('playwright')
const { spawn } = require('node:child_process')
const { mkdir } = require('node:fs/promises')
const assert = require('node:assert/strict')
const { assertCounselLayout } = require('./test-support/counsel-layout.cjs')

const origin = 'http://127.0.0.1:4178'
const server = spawn(
  process.execPath,
  ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '4178', '--strictPort'],
  {
    stdio: 'pipe',
    windowsHide: true,
  },
)
let serverOutput = ''
server.stdout.on('data', (data) => {
  serverOutput += data
})
server.stderr.on('data', (data) => {
  serverOutput += data
})
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const room = {
  sessionId: '00000000-0000-0000-0000-000000000001',
  status: 'ACTIVE',
  assignmentVersion: 1,
}
const conversationId = '10000000-0000-0000-0000-000000000001'
const previousTurns = [
  { question: '기존 요금제 문의', answer: 'AI의 기존 요금제 안내입니다.' },
  { question: '추가 질문', answer: 'AI의 추가 안내입니다.' },
]
const history = previousTurns.flatMap((turn, index) => [
  { sequence: index * 2 + 1, role: 'USER', content: turn.question, source: 'SAVED' },
  { sequence: index * 2 + 2, role: 'AI', content: turn.answer, source: 'SAVED' },
])
const errors = []

async function contextFor(browser, role) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 960 } })
  await context.addInitScript(
    ({ role }) => {
      const payload = btoa(
        JSON.stringify({
          sub: role === 'USER' ? '1' : role === 'COUNSELOR' ? '10' : '99',
          role,
          exp: Math.floor(Date.now() / 1000) + 3600,
        }),
      )
      sessionStorage.setItem('accessToken', `fixture.${payload}.fixture`)
      sessionStorage.setItem('refreshToken', 'fixture')
    },
    { role },
  )
  const state = {
    current: role === 'COUNSELOR' ? room : null,
    available: false,
    messages: [],
    receipts: new Map(),
    sends: [],
    reads: [],
    handoffs: [],
    currentReads: 0,
    failedOnce: false,
    abortedOnce: false,
    rateOnce: false,
  }
  await context.route(
    (url) => url.pathname.startsWith('/api/'),
    (route) => {
      const path = new URL(route.request().url()).pathname
      if (path.endsWith('/timeline')) {
        const entries = [
          ...(state.handoffs.length ? [] : history),
          ...(state.savedFaqs ?? []).flatMap((faq) => [
            { role: 'USER', content: faq.question, source: 'SAVED' },
            { role: 'AI', content: faq.answer, source: 'SAVED' },
          ]),
          ...state.messages.map((message) => ({
            ...message,
            role: message.senderRole,
            source: 'COUNSEL',
          })),
        ].map((item, index) => ({
          ...item,
          sequence: index + 1,
          cursor: `cursor:${index + 1}`,
          id: `fixture:${index}`,
          createdAt: new Date().toISOString(),
        }))
        const after = Number(
          (new URL(route.request().url()).searchParams.get('afterCursor') || 'cursor:0').split(
            ':',
          )[1],
        )
        const items = entries.filter((item) => item.sequence > after).slice(0, 100)
        const hasNext = entries.some((item) => item.sequence > (items.at(-1)?.sequence ?? after))
        return route.fulfill({
          json: {
            success: true,
            data: { items, hasNext, nextCursor: hasNext ? items.at(-1).cursor : null },
          },
        })
      }
      const data =
        path === '/api/conversations/me'
          ? {
              content: [
                {
                  conversationId,
                  title: '기존 요금제 문의',
                  lastQuestionAt: new Date().toISOString(),
                },
              ],
            }
          : path === `/api/conversations/${conversationId}/messages`
            ? previousTurns
            : path === '/api/notices/banners'
              ? { notices: [], outages: [] }
              : {}
      return route.fulfill({ json: { success: true, data } })
    },
  )
  await context.route(
    (url) =>
      url.pathname.startsWith('/api/counsel/') || url.pathname.startsWith('/api/admin/counsel/'),
    async (route) => {
      const request = route.request()
      const url = new URL(request.url())
      const path = url.pathname
      const ok = (data) =>
        route.fulfill({ json: { success: true, code: 'SUCCESS', message: '성공', data } })
      if (path.endsWith('/current')) {
        state.currentReads++
        return ok(state.current)
      }
      if (path.endsWith('/requests')) {
        const body = request.postDataJSON()
        state.handoffs.push(body)
        state.current = {
          ...room,
          conversationId:
            body.conversationId ??
            `30000000-0000-0000-0000-${String(state.handoffs.length).padStart(12, '0')}`,
          handoffId: body.handoffId,
        }
        return ok(state.current)
      }
      if (path.includes('/sessions/conversation/'))
        return ok(state.ended?.conversationId === path.split('/').at(-1) ? state.ended : null)
      const single = path.match(/^\/api\/counsel\/sessions\/([^/]+)$/)
      if (single && request.method() === 'GET') {
        // BE처럼 더 이상 배정되지 않은 상담사에게는 403, 없는 상담은 404를 돌려줌
        if (state.reassigned === single[1])
          return route.fulfill({
            status: 403,
            json: { success: false, code: 'COUNSEL-003', message: '접근 권한이 없습니다.' },
          })
        const found = [state.current, state.ended].find((s) => s?.sessionId === single[1])
        if (found) return ok(found)
        return route.fulfill({
          status: 404,
          json: { success: false, code: 'COUNSEL-004', message: '상담을 찾을 수 없습니다.' },
        })
      }
      if (path.endsWith('/context'))
        return ok(
          (state.handoffs.length ? [] : history)
            .filter((item) => item.sequence > Number(url.searchParams.get('afterSequence')))
            .slice(0, 100),
        )
      if (path.endsWith('/heartbeat'))
        return ok({ status: state.available ? 'AVAILABLE' : 'OFFLINE' })
      if (path.endsWith('/availability')) {
        state.available = request.postDataJSON().status === 'AVAILABLE'
        return ok({ status: state.available ? 'AVAILABLE' : 'OFFLINE' })
      }
      if (path.endsWith('/end')) {
        state.ended = { ...state.current, status: 'ENDED' }
        state.current = null
        return ok(state.ended)
      }
      if (path.endsWith('/messages')) {
        if (request.method() === 'GET') {
          state.reads.push(path)
          return ok(
            state.messages
              .filter((m) => m.deliverySequence > Number(url.searchParams.get('afterSequence')))
              .slice(0, Number(url.searchParams.get('limit')))
              .map(({ senderId, ...message }) => ({
                ...message,
                mine: senderId === (role === 'COUNSELOR' ? 10 : 1),
              })),
          )
        }
        const body = request.postDataJSON()
        state.sends.push(body)
        if (body.content === '요청 제한' && !state.rateOnce) {
          state.rateOnce = true
          return route.fulfill({
            status: 429,
            json: { success: false, code: 'COUNSEL-008', message: '전송이 너무 잦습니다.' },
          })
        }
        if (state.receipts.has(body.clientMessageId))
          return ok(state.receipts.get(body.clientMessageId))
        let status = body.content === '차단 문장' ? 'BLOCKED' : 'ALLOWED'
        if (body.content === '확인 대기') status = 'PENDING'
        if (body.content === '검사 실패' && !state.failedOnce) {
          state.failedOnce = true
          status = 'CHECK_FAILED'
        }
        const receipt = {
          messageId: state.receipts.size + 1,
          clientMessageId: body.clientMessageId,
          status,
          deliverySequence: status === 'ALLOWED' ? state.messages.length + 1 : null,
        }
        state.receipts.set(body.clientMessageId, receipt)
        if (status === 'ALLOWED')
          state.messages.push({
            ...receipt,
            senderId: role === 'COUNSELOR' ? 10 : 1,
            senderRole: role,
            content: body.content,
            createdAt: new Date().toISOString(),
          })
        if (body.content === '네트워크 재시도' && !state.abortedOnce) {
          state.abortedOnce = true
          return route.abort()
        }
        return ok(receipt)
      }
      if (path.endsWith('/summary'))
        return ok({ total: 3, allowed: 1, blocked: 1, checkFailed: 1, falsePositives: 0 })
      if (path.endsWith('/events'))
        return ok({
          page: 0,
          hasNext: false,
          items: [
            {
              id: 1,
              createdAt: new Date().toISOString(),
              sessionId: room.sessionId,
              senderRole: 'USER',
              decision: 'BLOCKED',
              category: 'INSULT',
              score: 0.97,
              threshold: 0.95,
              modelName: 'ubot-embedding',
              profileVersion: 'insult-v1',
              ruleVersion: 'direct-v1',
              errorCode: null,
            },
          ],
        })
      return route.fulfill({ status: 404, json: { success: false, message: 'No fixture' } })
    },
  )
  const page = await context.newPage()
  page.on('pageerror', (error) => errors.push(error.stack ?? error.message))
  return { context, page, state }
}

async function main() {
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw Error(serverOutput)
    if (
      await fetch(origin)
        .then((r) => r.ok)
        .catch(() => false)
    )
      break
    await sleep(100)
    if (i === 99) throw Error(`Vite startup timeout: ${serverOutput}`)
  }
  await mkdir('test-results/counsel', { recursive: true })
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}),
  })
  try {
    const customer = await contextFor(browser, 'USER')
    const p = customer.page
    await p.goto(`${origin}/#/counsel`)
    await p.getByTitle('기존 요금제 문의', { exact: true }).click()
    await p.screenshot({ path: 'test-results/counsel/ai-existing-design.png', fullPage: true })
    const originalHeader = await p.locator('.ai-app-head').boundingBox()
    await p.getByText('AI의 추가 안내입니다.', { exact: true }).waitFor()
    await p.getByRole('button', { name: '상담사 호출', exact: true }).click()
    await p.getByText('상담사와 연결되었어요').waitFor()
    assert.deepEqual(
      await p.locator('.ai-app-head').boundingBox(),
      originalHeader,
      'counsel must preserve the existing chat header layout',
    )
    assert.equal(new URL(p.url()).hash, '#/ai')
    assert.equal(customer.state.handoffs[0].conversationId, null)
    assert.notEqual(customer.state.current.conversationId, conversationId)
    assert.equal('faqIds' in customer.state.handoffs[0], false)
    assert.deepEqual(Object.keys(customer.state.handoffs[0]).sort(), [
      'conversationId',
      'handoffId',
    ])
    assert.equal(
      'displayedTurns' in customer.state.handoffs[0],
      false,
      'handoff must not send client-authored conversation text',
    )
    await p.getByText('상담사에게 현재 채팅창 메세지를 전달합니다.', { exact: true }).waitFor()
    assert.equal(await p.locator('.counsel-history-message').count(), 0)
    assert.equal(await p.getByTitle('기존 요금제 문의', { exact: true }).isDisabled(), true)
    const input = p.getByRole('textbox', { name: /메시지/ })
    await input.fill('차단 문장')
    await input.dispatchEvent('keydown', { key: 'Enter', code: 'Enter', isComposing: true })
    await input.press('Shift+Enter')
    assert.equal(
      customer.state.sends.length,
      0,
      'IME confirmation and Shift+Enter must not send a message',
    )
    assert.ok((await input.inputValue()).includes('\n'))
    await input.fill('차단 문장')
    await input.press('Enter')
    await p.getByText('부적절한 표현이 감지되어', { exact: false }).waitFor()
    assert.equal(customer.state.messages.length, 0)
    assert.equal(await p.locator('.counsel-message').count(), 0)

    await input.fill('검사 실패')
    await p.getByRole('button', { name: '메시지 전송', exact: true }).click()
    await p.getByText('현재 메시지를 확인할 수 없어', { exact: false }).waitFor()
    const failedId = customer.state.sends.at(-1).clientMessageId
    await p.getByRole('button', { name: '다시 전송하기' }).click()
    await p.getByText('전송 완료', { exact: true }).waitFor()
    assert.notEqual(customer.state.sends.at(-1).clientMessageId, failedId)

    await input.fill('네트워크 재시도')
    await p.getByRole('button', { name: '메시지 전송', exact: true }).click()
    await p.getByRole('button', { name: '전송 결과 확인' }).waitFor()
    const ambiguousId = customer.state.sends.at(-1).clientMessageId
    assert.equal(await input.isDisabled(), true)
    await p.getByRole('button', { name: '전송 결과 확인' }).click()
    await p.getByText('전송 완료', { exact: true }).waitFor()
    assert.equal(customer.state.sends.at(-1).clientMessageId, ambiguousId)
    assert.equal(customer.state.messages.filter((m) => m.content === '네트워크 재시도').length, 1)
    await p.locator('.counsel-message').filter({ hasText: '네트워크 재시도' }).waitFor()
    await p.screenshot({ path: 'test-results/counsel/customer-chat-design.png', fullPage: true })

    await input.fill('요청 제한')
    await p.getByRole('button', { name: '메시지 전송', exact: true }).click()
    await p.getByText('전송이 너무 잦습니다.', { exact: true }).waitFor()
    assert.equal(await input.isDisabled(), false)
    await p.screenshot({ path: 'test-results/counsel/customer-desktop.png', fullPage: true })
    await p.setViewportSize({ width: 390, height: 844 })
    assert.equal(
      await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      true,
    )
    const sendBounds = await p
      .getByRole('button', { name: '메시지 전송', exact: true })
      .boundingBox()
    const navigationBounds = await p.locator('.bottom-nav').boundingBox()
    assert.ok(
      sendBounds.y + sendBounds.height <= navigationBounds.y,
      'mobile navigation must not cover the send button',
    )
    await p.screenshot({ path: 'test-results/counsel/customer-mobile.png', fullPage: true })
    await p.setViewportSize({ width: 320, height: 667 })
    assert.equal(
      await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      true,
    )
    await p.screenshot({ path: 'test-results/counsel/customer-mobile-small.png', fullPage: true })
    await p.setViewportSize({ width: 390, height: 844 })
    await p.reload()
    await p.locator('.counsel-message').filter({ hasText: '네트워크 재시도' }).waitFor()
    assert.equal(await p.locator('.counsel-message').count(), 2)

    // 종료 전에 여러 페이지가 확정될 수 있으므로 마지막까지 읽은 뒤 고객 쪽 조회 두 개를 멈춰야 함
    for (let i = 0; i < 101; i++)
      customer.state.messages.push({
        messageId: 100 + i,
        senderId: 10,
        senderRole: 'COUNSELOR',
        content: `종료 직전 ${i}`,
        deliverySequence: 3 + i,
        createdAt: new Date().toISOString(),
      })
    await p.getByRole('button', { name: '상담 종료', exact: true }).click()
    await p.getByText('상담이 종료되었어요').waitFor()
    await p.getByText('종료 직전 100', { exact: true }).waitFor()
    assert.equal(await p.locator('.counsel-history-message').count(), 103)
    assert.ok(
      (await p.locator('.counsel-messages').boundingBox()).height <= 424,
      'long history must scroll inside the conversation',
    )
    const endedReads = customer.state.reads.length
    const endedCurrentReads = customer.state.currentReads
    await sleep(4500)
    assert.equal(
      customer.state.reads.length,
      endedReads,
      'ended customer must stop history polling',
    )
    assert.equal(
      customer.state.currentReads,
      endedCurrentReads,
      'ended customer must stop current polling',
    )

    // 새 요청은 상태 조회를 다시 시작하고, 상대방이 종료하면 PENDING 재전송도 멈춰야 함
    customer.state.messages = []
    await p.getByRole('button', { name: '상담사 호출', exact: true }).click()
    await p.getByText('상담사와 연결되었어요').waitFor()
    await input.fill('확인 대기')
    await p.getByRole('button', { name: '메시지 전송', exact: true }).click()
    await p.getByText('표현을 확인하고 있어요.', { exact: false }).waitFor()
    customer.state.ended = { ...customer.state.current, status: 'ENDED' }
    customer.state.current = null
    await p.getByText('상담이 종료되었어요').waitFor()
    await sleep(300)
    const remoteReads = customer.state.reads.length
    const remotePosts = customer.state.sends.length
    const remoteCurrentReads = customer.state.currentReads
    await sleep(4500)
    assert.equal(customer.state.reads.length, remoteReads)
    assert.equal(customer.state.sends.length, remotePosts, 'no automatic PENDING POST after end')
    assert.equal(customer.state.currentReads, remoteCurrentReads)
    await customer.context.close()

    const faqCustomer = await contextFor(browser, 'USER')
    const selections = []
    await faqCustomer.context.route('**/api/conversations/faq-selections', (route) => {
      const body = route.request().postDataJSON()
      selections.push(body)
      const saved = {
        ...body,
        conversationId: body.conversationId ?? conversationId,
        question: `서버 FAQ 질문 ${body.faqId}`,
        answer: `서버 저장 FAQ 답변 ${body.faqId}`,
      }
      faqCustomer.state.savedFaqs = [...(faqCustomer.state.savedFaqs ?? []), saved]
      return route.fulfill({ json: { success: true, data: saved } })
    })
    await faqCustomer.context.route('**/api/rankings', (route) =>
      route.fulfill({
        json: {
          success: true,
          data: {
            popular: {
              calculatedAt: new Date().toISOString(),
              rankings: [
                {
                  faqId: 42,
                  rank: 1,
                  question: '인계할 FAQ 질문',
                  answer: '브라우저에 표시된 FAQ 답변',
                  currentCount: 10,
                },
                {
                  faqId: 43,
                  rank: 2,
                  question: '종료 후 선택할 FAQ',
                  answer: '종료 후 화면 답변',
                  currentCount: 9,
                },
              ],
            },
            trend: null,
            regionalTrend: {},
          },
        },
      }),
    )
    await faqCustomer.page.goto(`${origin}/#/ai`)
    await faqCustomer.page
      .locator('.ai-right')
      .getByRole('button', { name: /인계할 FAQ 질문/ })
      .click()
    await faqCustomer.page.getByText('서버 저장 FAQ 답변 42', { exact: true }).waitFor()
    await faqCustomer.page.getByRole('button', { name: '상담사 호출', exact: true }).click()
    await faqCustomer.page.getByText('상담사와 연결되었어요').waitFor()
    const firstCounselConversationId = faqCustomer.state.current.conversationId
    assert.equal(faqCustomer.state.handoffs[0].conversationId, null)
    assert.equal('faqIds' in faqCustomer.state.handoffs[0], false)
    assert.equal(selections[0].faqId, 42)
    assert.equal(typeof selections[0].selectionId, 'string')
    assert.equal('answer' in selections[0], false)
    assert.equal('displayedTurns' in faqCustomer.state.handoffs[0], false)
    assert.equal(JSON.stringify(faqCustomer.state.handoffs[0]).includes('브라우저에 표시된'), false)
    await faqCustomer.page.getByRole('button', { name: '상담 종료', exact: true }).click()
    await faqCustomer.page.getByText('상담이 종료되었어요').waitFor()
    const faqAfterEnd = faqCustomer.page
      .locator('.ai-right')
      .getByRole('button', { name: /종료 후 선택할 FAQ/ })
    await faqAfterEnd.click()
    await faqCustomer.page.getByText('서버 저장 FAQ 답변 43', { exact: true }).waitFor()
    await faqCustomer.page.getByRole('button', { name: '상담사 호출', exact: true }).click()
    await faqCustomer.page.getByText('상담사와 연결되었어요').waitFor()
    assert.equal(selections[1].conversationId, firstCounselConversationId)
    assert.equal(faqCustomer.state.handoffs[1].conversationId, null)
    assert.notEqual(faqCustomer.state.current.conversationId, firstCounselConversationId)
    assert.equal('faqIds' in faqCustomer.state.handoffs[1], false)
    assert.deepEqual(Object.keys(faqCustomer.state.handoffs[1]).sort(), [
      'conversationId',
      'handoffId',
    ])
    await faqCustomer.context.close()

    const directCustomer = await contextFor(browser, 'USER')
    const chatbotRequests = []
    directCustomer.page.on('request', (request) => {
      if (new URL(request.url()).pathname.startsWith('/api/chat/'))
        chatbotRequests.push(request.url())
    })
    await directCustomer.page.goto(`${origin}/#/ai`)
    await directCustomer.page.getByRole('button', { name: '상담사 호출', exact: true }).click()
    await directCustomer.page
      .getByText('상담사에게 현재 채팅창 메세지를 전달합니다.', { exact: true })
      .waitFor()
    assert.equal(directCustomer.state.handoffs[0].conversationId, null)
    assert.equal(await directCustomer.page.locator('.counsel-history-message').count(), 0)
    assert.deepEqual(chatbotRequests, [], 'direct counsel must not create an AI question')
    await directCustomer.context.close()

    const counselor = await contextFor(browser, 'COUNSELOR')
    await counselor.page.goto(`${origin}/#/counselor`)
    await counselor.page.getByRole('heading', { name: '상담사 업무 공간' }).waitFor()
    await counselor.page
      .locator('.counsel-history-message')
      .filter({ hasText: 'AI의 추가 안내입니다.' })
      .waitFor()
    await counselor.page.getByRole('button', { name: '상담 가능으로 전환' }).click()
    await counselor.page.getByText('현재 상태: 상담 가능').waitFor()
    await counselor.page
      .getByRole('textbox', { name: /메시지/ })
      .fill('확인 후 안내해 드리겠습니다.')
    await counselor.page.getByRole('button', { name: '메시지 전송', exact: true }).click()
    await counselor.page.getByText('전송 완료', { exact: true }).waitFor()
    await counselor.page
      .locator('.counsel-message')
      .filter({ hasText: '확인 후 안내해 드리겠습니다.' })
      .waitFor()
    await assertCounselLayout(counselor.page)
    await counselor.page.screenshot({ path: 'test-results/counsel/counselor.png', fullPage: true })
    await counselor.page.setViewportSize({ width: 390, height: 844 })
    await assertCounselLayout(counselor.page)
    await counselor.page.screenshot({
      path: 'test-results/counsel/counselor-mobile.png',
      fullPage: true,
    })
    await counselor.page.reload()
    await assertCounselLayout(counselor.page)
    await counselor.page.setViewportSize({ width: 1280, height: 960 })

    // 연결이 끊긴 사이 다른 상담사에게 재배정되면 종료로 표시하지 않아야 함
    const assigned = counselor.state.current
    counselor.state.reassigned = assigned.sessionId
    counselor.state.current = null
    await counselor.page
      .getByText('이 상담은 더 이상 배정되어 있지 않아요.', { exact: false })
      .waitFor()
    assert.equal(await counselor.page.getByText('상담이 종료되었어요').count(), 0)
    counselor.state.reassigned = null
    counselor.state.current = assigned
    await counselor.page.getByText('상담사와 연결되었어요').waitFor()

    await counselor.page.getByRole('button', { name: '상담 종료', exact: true }).click()
    await counselor.page.getByText('상담이 종료되었어요').waitFor()
    assert.equal(await counselor.page.getByRole('textbox', { name: /메시지/ }).isDisabled(), true)
    await sleep(300)
    const oldRoomPath = `/api/counsel/sessions/${room.sessionId}/messages`
    const oldReads = counselor.state.reads.filter((path) => path === oldRoomPath).length
    const counselorCurrent = counselor.state.currentReads
    counselor.state.messages = []
    counselor.state.current = { ...room, sessionId: '00000000-0000-0000-0000-000000000002' }
    await counselor.page.getByText('상담사와 연결되었어요').waitFor()
    await sleep(2300)
    assert.equal(
      counselor.state.reads.filter((path) => path === oldRoomPath).length,
      oldReads,
      'ended counselor history stops',
    )
    assert.ok(
      counselor.state.currentReads > counselorCurrent,
      'counselor discovers next assignment',
    )
    assert.ok(
      counselor.state.reads.some((path) => path.includes(counselor.state.current.sessionId)),
    )
    await counselor.context.close()

    const admin = await contextFor(browser, 'ADMIN')
    await admin.page.goto(`${origin}/#/admin/counsel-safety`)
    await admin.page.getByRole('heading', { name: '상담 안전성 모니터링' }).waitFor()
    await admin.page.getByRole('cell', { name: '차단', exact: true }).waitFor()
    assert.equal(await admin.page.getByRole('cell', { name: '0.9700', exact: true }).count(), 1)
    await admin.page.getByRole('combobox').selectOption('BLOCKED')
    await Promise.all([
      admin.page.waitForRequest((request) => {
        const url = new URL(request.url())
        return url.pathname.endsWith('/events') && url.searchParams.get('decision') === 'BLOCKED'
      }),
      admin.page.getByRole('button', { name: '조회', exact: true }).click(),
    ])
    await admin.page.getByRole('cell', { name: '차단', exact: true }).waitFor()
    await admin.page.screenshot({ path: 'test-results/counsel/admin.png', fullPage: true })
    assert.equal(await admin.page.getByText('차단 문장', { exact: true }).count(), 0)
    await admin.context.close()

    // Pages 빌드의 lint 검사에서 드러난 기존 대시보드 effect 두 개의 비동기 처리를 확인함
    const dashboard = await contextFor(browser, 'ADMIN')
    let failImprovements = false
    let releaseOldDuplicate
    const oldDuplicate = new Promise((resolve) => {
      releaseOldDuplicate = resolve
    })
    const improvement = (faqId, question) => ({
      faqId,
      question,
      intent: 'USER_DATA',
      faqVersion: 1,
      versionStartedAt: '2026-10-20T00:00:00',
      improvementTypes: ['DUPLICATE_SUSPECTED'],
      topKCount: 20,
      averageSimilarity: 0.9,
      top1SampleCount: 10,
      reviewableTopKCount: 5,
      averageTopGap: 0.01,
      lowGapRate: 0.8,
    })
    const improvements = [improvement(1, '첫 번째 개선 질문'), improvement(2, '두 번째 개선 질문')]
    await dashboard.context.route(
      (url) => url.pathname.startsWith('/api/admin/faq-monitoring'),
      async (route) => {
        const url = new URL(route.request().url())
        if (url.pathname.endsWith('/improvements')) {
          if (failImprovements) {
            failImprovements = false
            return route.fulfill({
              status: 503,
              json: { success: false, message: '테스트 조회 실패' },
            })
          }
          return route.fulfill({
            json: {
              success: true,
              data: {
                evaluatedAt: '2026-10-20T12:00:00',
                items: improvements,
                page: 0,
                size: 5,
                totalElements: 2,
                totalPages: 1,
                first: true,
                last: true,
              },
            },
          })
        }
        if (url.pathname.endsWith('/duplicates')) {
          const old = url.pathname.includes('/1/')
          if (old) await oldDuplicate
          return route.fulfill({
            json: {
              success: true,
              data: [
                {
                  faqId: old ? 101 : 202,
                  question: old ? '지난 선택의 늦은 후보' : '현재 선택의 후보',
                  top1Count: 10,
                  pairCount: 5,
                },
              ],
            },
          })
        }
        return route.fulfill({
          status: 503,
          json: { success: false, message: '모니터링 fixture 제외' },
        })
      },
    )
    const d = dashboard.page
    await d.goto(`${origin}/#/admin/dashboard`)
    await d.getByRole('cell', { name: '첫 번째 개선 질문', exact: true }).waitFor()
    const refresh = d.getByRole('button', { name: '개선이 필요한 FAQ 새로고침' })
    assert.equal(await refresh.isEnabled(), true)
    failImprovements = true
    await refresh.click()
    await d.getByRole('alert').filter({ hasText: '테스트 조회 실패' }).waitFor()
    await refresh.click()
    await d.getByRole('alert').filter({ hasText: '테스트 조회 실패' }).waitFor({ state: 'hidden' })
    const firstRequest = d.waitForRequest((request) =>
      request.url().includes('/improvements/1/duplicates'),
    )
    await d.getByRole('cell', { name: '첫 번째 개선 질문', exact: true }).click()
    await firstRequest
    await d.getByText('중복 의심 FAQ를 불러오는 중입니다.', { exact: true }).waitFor()
    await d.getByRole('cell', { name: '두 번째 개선 질문', exact: true }).click()
    await d.getByRole('cell', { name: '현재 선택의 후보', exact: true }).waitFor()
    const oldResponse = d.waitForResponse((response) =>
      response.url().includes('/improvements/1/duplicates'),
    )
    releaseOldDuplicate()
    await oldResponse
    await sleep(100)
    assert.equal(await d.getByText('지난 선택의 늦은 후보', { exact: true }).count(), 0)
    assert.equal(await d.getByRole('cell', { name: '현재 선택의 후보', exact: true }).count(), 1)
    await d.getByRole('cell', { name: '두 번째 개선 질문', exact: true }).click()
    assert.equal(
      await d.getByRole('heading', { name: '중복 의심 FAQ 목록', exact: true }).count(),
      0,
    )
    await dashboard.context.close()
    assert.deepEqual(errors, [])
    const preview = await contextFor(browser, 'USER')
    preview.state.current = { ...room, conversationId }
    preview.state.messages = [
      {
        messageId: 1,
        senderId: 1,
        senderRole: 'USER',
        content: '지금 사용하는 요금제를 변경하고 싶어요.',
        deliverySequence: 1,
        createdAt: '2026-10-20T11:30:00Z',
      },
      {
        messageId: 2,
        senderId: 10,
        senderRole: 'COUNSELOR',
        content:
          '앞서 문의하신 내용을 확인했습니다. 원하시는 데이터 사용량에 맞춰 안내해 드릴게요.',
        deliverySequence: 2,
        createdAt: '2026-10-20T11:31:00Z',
      },
    ]
    await preview.page.goto(`${origin}/#/ai`)
    await preview.page
      .locator('.counsel-message')
      .filter({ hasText: '앞서 문의하신 내용을 확인했습니다.' })
      .waitFor()
    await preview.page
      .locator('.counsel-messages')
      .evaluate((list) => list.scrollTo({ top: list.scrollHeight, behavior: 'instant' }))
    await preview.page.screenshot({
      path: 'test-results/counsel/design-desktop.png',
      fullPage: true,
    })
    await preview.page.setViewportSize({ width: 390, height: 844 })
    await preview.page
      .locator('.counsel-messages')
      .evaluate((list) => list.scrollTo({ top: list.scrollHeight, behavior: 'instant' }))
    await preview.page.screenshot({
      path: 'test-results/counsel/design-mobile.png',
      fullPage: true,
    })
    await preview.context.close()
    console.log(
      'PASS: existing chat layout, IME/Enter input, mobile composer visibility, roles, delivery/retry, reload/mobile, local+remote end, final 101-message drain, stopped PENDING retries, next assignment, dashboard refresh/error/stale-response regression',
    )
  } catch (error) {
    for (const context of browser.contexts())
      for (const page of context.pages()) {
        await page
          .screenshot({ path: 'test-results/counsel/failure.png', fullPage: true })
          .catch(() => {})
        console.error(
          'Browser failure:',
          page.url(),
          (await page.locator('body').innerText()).slice(0, 2000),
          errors,
        )
      }
    throw error
  } finally {
    await browser.close()
  }
}
main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => server.kill())
