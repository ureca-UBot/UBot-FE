const { chromium } = require('playwright')
const { spawn } = require('node:child_process')
const { mkdir } = require('node:fs/promises')
const assert = require('node:assert/strict')

const origin = 'http://127.0.0.1:4179'
const server = spawn(
  process.execPath,
  ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '4179', '--strictPort'],
  { stdio: 'pipe', windowsHide: true },
)
let output = ''
server.stdout.on('data', (data) => {
  output += data
})
server.stderr.on('data', (data) => {
  output += data
})
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const counselId = '10000000-0000-0000-0000-000000000001'
const aiId = '10000000-0000-0000-0000-000000000002'
const olderId = '10000000-0000-0000-0000-000000000003'
const room = {
  sessionId: '20000000-0000-0000-0000-000000000001',
  conversationId: counselId,
  status: 'ENDED',
  assignmentVersion: 2,
  lastDeliveredSeq: 130,
}
const entries = [
  { role: 'USER', content: '연결 전 질문', source: 'SAVED' },
  { role: 'AI', content: '연결 전 AI 답변', source: 'SAVED' },
  { role: 'SYSTEM', content: '상담사 연결 요청', source: 'COUNSEL' },
  ...Array.from({ length: 130 }, (_, index) => ({
    role: index % 2 ? 'COUNSELOR' : 'USER',
    content: `보존된 상담 메시지 ${index}`,
    source: 'COUNSEL',
  })),
  { role: 'SYSTEM', content: '상담 종료', source: 'COUNSEL' },
].map((item, index) => ({
  ...item,
  sequence: index + 1,
  cursor: `cursor:${index + 1}`,
  id: `entry:${index}`,
  sessionId: room.sessionId,
  createdAt: '2026-10-20T08:00:00Z',
}))
const errors = []

async function fixture(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 960 } })
  await context.addInitScript(() => {
    const payload = btoa(
      JSON.stringify({ sub: '1', role: 'USER', exp: Math.floor(Date.now() / 1000) + 3600 }),
    )
    sessionStorage.setItem('accessToken', `fixture.${payload}.fixture`)
    sessionStorage.setItem('refreshToken', 'fixture')
  })
  const state = { timelineReads: [], currentReads: 0, failTimeline: false, hold: null, held: false }
  await context.route(
    (url) => url.pathname.startsWith('/api/'),
    async (route) => {
      const url = new URL(route.request().url())
      const path = url.pathname
      const ok = (data) => route.fulfill({ json: { success: true, data } })
      if (path === '/api/conversations/me') {
        const older = url.searchParams.get('page') === '1'
        return ok({
          content: older
            ? [
                {
                  conversationId: olderId,
                  title: '오래된 상담',
                  hasCounsel: true,
                  lastQuestionAt: '2026-10-01T08:00:00Z',
                },
              ]
            : [
                {
                  conversationId: counselId,
                  title: '상담으로 시작한 문의',
                  preview: '보존된 상담 메시지 129',
                  hasCounsel: true,
                  lastQuestionAt: '2026-10-20T08:00:00Z',
                },
                {
                  conversationId: aiId,
                  title: 'AI 전용 대화',
                  hasCounsel: false,
                  lastQuestionAt: '2026-10-19T08:00:00Z',
                },
              ],
          last: older,
        })
      }
      if (path.endsWith('/current')) {
        state.currentReads++
        return ok(null)
      }
      if (path.includes('/sessions/conversation/'))
        return ok(path.endsWith(aiId) ? null : { ...room, conversationId: path.split('/').at(-1) })
      if (path === `/api/counsel/sessions/${room.sessionId}`) return ok(room)
      if (path.endsWith('/timeline')) {
        state.timelineReads.push(url.searchParams.get('afterCursor'))
        if (state.hold) {
          state.held = true
          await state.hold
        }
        if (state.failTimeline) {
          return route.fulfill({
            status: 503,
            json: { success: false, message: '일시적인 기록 조회 실패' },
          })
        }
        const after = Number((url.searchParams.get('afterCursor') || 'cursor:0').split(':')[1])
        const items = entries.filter((item) => item.sequence > after).slice(0, 100)
        const hasNext = entries.some((item) => item.sequence > (items.at(-1)?.sequence ?? after))
        return ok({ items, hasNext, nextCursor: hasNext ? items.at(-1).cursor : null })
      }
      if (path.includes('/conversations/') && path.endsWith('/messages'))
        return ok(
          path.includes(aiId)
            ? [
                {
                  id: 1,
                  question: '일반 AI 질문',
                  answer: '기존 AI 답변',
                  createdAt: '2026-10-19T08:00:00Z',
                },
              ]
            : [],
        )
      if (path === '/api/notices/banners') return ok({ notices: [], outages: [] })
      return ok({})
    },
  )
  const page = await context.newPage()
  page.on('pageerror', (error) => errors.push(error.message))
  return { context, page, state }
}

async function main() {
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw Error(output)
    if (
      await fetch(origin)
        .then((r) => r.ok)
        .catch(() => false)
    )
      break
    await sleep(100)
    if (i === 99) throw Error(output)
  }
  await mkdir('test-results/counsel', { recursive: true })
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}),
  })
  try {
    const { page, context, state } = await fixture(browser)
    await page.goto(`${origin}/#/ai`)
    await page.getByRole('button', { name: /상담으로 시작한 문의/ }).click()
    const transcript = page.getByRole('region', { name: '전체 대화 기록' })
    await transcript.getByText('보존된 상담 메시지 129', { exact: true }).waitFor()
    assert.equal(await transcript.locator('article').count(), 132)
    assert.equal(await transcript.getByText('연결 전 AI 답변', { exact: true }).count(), 1)
    // 개발 StrictMode는 첫 effect를 취소하고 다시 실행할 수 있음
    assert.deepEqual([...new Set(state.timelineReads)], ['', 'cursor:100'])
    const stoppedAt = [state.timelineReads.length, state.currentReads]
    await sleep(4500)
    assert.deepEqual(
      [state.timelineReads.length, state.currentReads],
      stoppedAt,
      'ended archive must not poll',
    )

    await page.getByRole('button', { name: /AI 전용 대화/ }).click()
    await page.getByText('기존 AI 답변', { exact: true }).waitFor()
    assert.equal(await transcript.count(), 0)
    // 취소된 StrictMode 요청이 실패를 먼저 소모하지 않도록 복구 시점을 직접 제어함
    state.failTimeline = true
    await page.getByRole('button', { name: /상담으로 시작한 문의/ }).click()
    await page.getByRole('alert').filter({ hasText: '일시적인 기록 조회 실패' }).waitFor()
    state.failTimeline = false
    await page.getByRole('button', { name: '기록 다시 불러오기' }).click()
    await transcript.getByText('보존된 상담 메시지 129', { exact: true }).waitFor()
    await page.reload()
    await transcript.getByText('보존된 상담 메시지 129', { exact: true }).waitFor()
    await page.screenshot({ path: 'test-results/counsel/history-desktop.png', fullPage: true })

    await page.getByRole('button', { name: '이전 대화 더 보기' }).click()
    await page.getByRole('button', { name: /오래된 상담/ }).click()
    await transcript.getByText('보존된 상담 메시지 129', { exact: true }).waitFor()
    await page.getByRole('button', { name: '새 AI 대화 시작' }).click()
    assert.equal(await transcript.count(), 0)
    let release
    state.hold = new Promise((resolve) => {
      release = resolve
    })
    await page.getByRole('button', { name: /상담으로 시작한 문의/ }).click()
    await page.getByText('대화 기록을 불러오고 있어요.', { exact: true }).waitFor()
    await page.getByRole('button', { name: /AI 전용 대화/ }).click()
    await page.getByText('기존 AI 답변', { exact: true }).waitFor()
    release()
    state.hold = null
    await sleep(300)
    assert.equal(
      await transcript.count(),
      0,
      'late archive response must not replace another conversation',
    )
    await context.close()

    // 새 로그인 컨텍스트에는 상담 포인터가 없으므로 기존 목록만으로 다시 찾아야 함
    const fresh = await fixture(browser)
    await fresh.page.setViewportSize({ width: 390, height: 844 })
    await fresh.page.goto(`${origin}/#/ai`)
    assert.equal(await fresh.page.evaluate(() => sessionStorage.getItem('counsel:session:1')), null)
    await fresh.page.getByText('최근 대화 · 상담 내역', { exact: true }).click()
    await fresh.page.getByRole('button', { name: /상담으로 시작한 문의/ }).click()
    await fresh.page
      .getByRole('region', { name: '전체 대화 기록' })
      .getByText('보존된 상담 메시지 129', { exact: true })
      .waitFor()
    assert.equal(
      await fresh.page.locator('.ai-mobile-history').getAttribute('open'),
      null,
      'mobile history should collapse after selection',
    )
    assert.equal(
      await fresh.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      true,
    )
    await fresh.page.screenshot({ path: 'test-results/counsel/history-mobile.png', fullPage: true })
    await fresh.context.close()
    assert.deepEqual(errors, [])
    console.log(
      'PASS: archived counsel from existing list, 134-entry pagination, no duplicates, reload/fresh login, mobile, list paging, retry, stale response, stopped polling, existing AI history',
    )
  } catch (error) {
    for (const context of browser.contexts())
      for (const page of context.pages()) {
        await page
          .screenshot({ path: 'test-results/counsel/history-failure.png', fullPage: true })
          .catch(() => {})
        console.error((await page.locator('body').innerText()).slice(-2000))
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
