const { chromium } = require('playwright')
const { spawn } = require('node:child_process')
const { mkdir, writeFile } = require('node:fs/promises')
const assert = require('node:assert/strict')

const origin = 'http://127.0.0.1:4180'
const server = spawn(
  process.execPath,
  ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '4180', '--strictPort'],
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
const base = '/api/admin/counsel/safety/sentences'
const checks = []
const errors = []
const row = (id, content, overrides = {}) => ({
  sentenceId: id,
  content,
  category: 'INSULT',
  severity: 1,
  enabled: true,
  revision: 1,
  indexStatus: 'INDEXED',
  applied: true,
  indexedRevision: 1,
  vectorId: id,
  indexError: null,
  model: 'ubot-embedding',
  profile: 'fixture',
  createdAt: '2026-10-21T01:00:00Z',
  updatedAt: '2026-10-21T01:00:00Z',
  ...overrides,
})

async function fixture(browser, role) {
  const context = await browser.newContext({ viewport: { width: 1400, height: 950 } })
  await context.addInitScript((role) => {
    const payload = btoa(
      JSON.stringify({ sub: '3', role, exp: Math.floor(Date.now() / 1000) + 3600 }),
    )
    sessionStorage.setItem('accessToken', `fixture.${payload}.fixture`)
    sessionStorage.setItem('refreshToken', 'fixture')
  }, role)
  const state = {
    items: [
      row(1, '기존 검사 문장'),
      row(2, '색인 실패 문장', {
        indexStatus: 'FAILED',
        applied: false,
        indexError: 'WORKER_TIMEOUT',
      }),
    ],
    requests: [],
    reads: 0,
    conflict: false,
    failList: false,
    pendingReads: 0,
  }
  await context.route(
    (url) => url.pathname.startsWith('/api/'),
    async (route) => {
      const request = route.request()
      const url = new URL(request.url())
      const ok = (data) => route.fulfill({ json: { success: true, data } })
      const fail = (status, code, message) =>
        route.fulfill({ status, json: { success: false, code, message } })
      if (!url.pathname.startsWith(base))
        return ok(url.pathname.endsWith('/banners') ? { notices: [], outages: [] } : {})
      state.requests.push({
        method: request.method(),
        path: url.pathname,
        search: url.search,
        body:
          request.method() === 'POST' || request.method() === 'PATCH'
            ? request.postDataJSON()
            : null,
      })
      if (url.pathname === base && request.method() === 'GET') {
        state.reads++
        if (state.failList) return fail(503, 'COUNSEL-011', '목록을 불러오지 못했습니다.')
        const page = Number(url.searchParams.get('page'))
        if (page === 1) return ok({ items: [row(99, '다음 페이지 문장')], page, hasNext: false })
        if (++state.pendingReads >= 2)
          for (const item of state.items) {
            if (item.enabled && item.indexStatus === 'PENDING')
              Object.assign(item, {
                indexStatus: 'INDEXED',
                applied: true,
                indexedRevision: item.revision,
              })
          }
        const keyword = url.searchParams.get('keyword') || ''
        return ok({
          items: state.items.filter((item) => item.content.includes(keyword)),
          page,
          hasNext: !keyword,
        })
      }
      if (url.pathname === base && request.method() === 'POST') {
        const body = request.postDataJSON()
        assert.deepEqual(Object.keys(body).sort(), ['content', 'severity'])
        if (state.items.some((item) => item.content === body.content))
          return fail(409, 'COUNSEL-014', '동일한 금지 문장이 이미 등록되어 있습니다.')
        const created = row(3, body.content, {
          severity: body.severity,
          indexStatus: 'PENDING',
          applied: false,
        })
        state.items.unshift(created)
        state.pendingReads = 0
        return ok(created)
      }
      const id = Number(url.pathname.slice(base.length + 1).split('/')[0])
      const item = state.items.find((item) => item.sentenceId === id)
      if (!item) return fail(404, 'COUNSEL-013', '금지 문장을 찾을 수 없습니다.')
      if (request.method() === 'GET') return ok(item)
      if (url.pathname.endsWith('/index')) {
        assert.equal(request.postDataJSON().revision, item.revision)
        Object.assign(item, { indexStatus: 'INDEXED', applied: true, indexError: null })
        return ok(item)
      }
      if (request.method() === 'DELETE') {
        assert.equal(Number(url.searchParams.get('revision')), item.revision)
        state.items = state.items.filter((value) => value !== item)
        return ok(null)
      }
      const body = request.postDataJSON()
      assert.deepEqual(Object.keys(body).sort(), ['content', 'enabled', 'revision', 'severity'])
      if (state.conflict) {
        state.conflict = false
        item.revision++
        item.content = '다른 관리자가 수정한 문장'
        return fail(409, 'COUNSEL-006', '문장이 변경됐습니다. 최신 내용을 다시 조회해 주세요.')
      }
      assert.equal(body.revision, item.revision)
      const preserve = body.content === item.content && item.enabled && body.enabled && item.applied
      Object.assign(item, body, {
        revision: item.revision + 1,
        indexStatus: preserve ? 'INDEXED' : 'PENDING',
        applied: preserve,
      })
      state.pendingReads = 0
      return ok(item)
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
  let activePage
  try {
    const { page, context, state } = await fixture(browser, 'ADMIN')
    activePage = page
    const itemRow = (content) =>
      page.getByRole('row').filter({ has: page.getByRole('cell', { name: content, exact: true }) })
    await page.goto(`${origin}/#/admin/counsel-sentences`)
    await itemRow('기존 검사 문장').waitFor()
    await page.getByRole('button', { name: '문장 등록', exact: true }).click()
    const editor = page.getByRole('dialog')
    await editor.getByLabel('문장', { exact: true }).fill('새 상담 검사 문장')
    await editor.getByLabel('심각도').selectOption('2')
    await editor.getByRole('button', { name: '저장', exact: true }).click()
    await itemRow('새 상담 검사 문장').getByText('차단에 적용 중', { exact: true }).waitFor()
    assert.equal(state.requests.filter((request) => request.path.endsWith('/index')).length, 0)
    await sleep(300)
    const reads = state.reads
    await sleep(2300)
    assert.equal(state.reads, reads, 'index completion must stop polling')
    checks.push('Creation uses automatic indexing and stops polling after completion')

    await itemRow('새 상담 검사 문장').getByRole('button', { name: '수정', exact: true }).click()
    await editor.getByLabel('심각도').selectOption('3')
    await editor.getByRole('button', { name: '저장', exact: true }).click()
    await itemRow('새 상담 검사 문장').getByText('3단계', { exact: true }).waitFor()
    await itemRow('새 상담 검사 문장').getByText('차단에 적용 중', { exact: true }).waitFor()
    checks.push('Severity edit carries the server revision and preserves applied status')

    state.conflict = true
    await itemRow('새 상담 검사 문장').getByRole('button', { name: '수정', exact: true }).click()
    await editor.getByLabel('문장', { exact: true }).fill('오래된 화면의 수정')
    await editor.getByRole('button', { name: '저장', exact: true }).click()
    await editor.getByRole('button', { name: '최신 내용 불러오기' }).waitFor()
    assert.equal(await editor.getByRole('button', { name: '저장', exact: true }).isDisabled(), true)
    await editor.getByRole('button', { name: '최신 내용 불러오기' }).click()
    await page.waitForFunction(
      () => document.querySelector('dialog textarea')?.value === '다른 관리자가 수정한 문장',
    )
    await editor.getByLabel('문장', { exact: true }).fill('최신 상태에서 수정한 문장')
    await editor.getByRole('button', { name: '저장', exact: true }).click()
    await itemRow('최신 상태에서 수정한 문장')
      .getByText('차단에 적용 중', { exact: true })
      .waitFor()
    checks.push('Concurrent edit rejects stale revision and reloads before saving')

    await itemRow('최신 상태에서 수정한 문장').getByRole('button', { name: '비활성화' }).click()
    await itemRow('최신 상태에서 수정한 문장').getByText('적용 안 함', { exact: true }).waitFor()
    await sleep(300)
    const disabledReads = state.reads
    await sleep(2300)
    assert.equal(state.reads, disabledReads)
    await itemRow('최신 상태에서 수정한 문장')
      .getByRole('button', { name: '활성화', exact: true })
      .click()
    await itemRow('최신 상태에서 수정한 문장')
      .getByText('차단에 적용 중', { exact: true })
      .waitFor()
    await itemRow('색인 실패 문장').getByRole('button', { name: '색인 재시도' }).click()
    await itemRow('색인 실패 문장').getByText('차단에 적용 중', { exact: true }).waitFor()
    checks.push('Disable stops polling, enable reindexes, only failures expose manual retry')

    await page.screenshot({
      path: 'test-results/counsel/admin-sentences-desktop.png',
      fullPage: true,
    })
    page.once('dialog', (dialog) => dialog.accept())
    await itemRow('최신 상태에서 수정한 문장')
      .getByRole('button', { name: '삭제', exact: true })
      .click()
    await itemRow('최신 상태에서 수정한 문장').waitFor({ state: 'detached' })
    await page.getByRole('button', { name: '다음', exact: true }).click()
    await itemRow('다음 페이지 문장').waitFor()
    assert.equal(await page.getByRole('button', { name: '다음', exact: true }).isDisabled(), true)
    await page.getByRole('button', { name: '이전', exact: true }).click()
    await itemRow('기존 검사 문장').waitFor()
    state.failList = true
    await page.getByRole('button', { name: '새로고침', exact: true }).click()
    await page.getByRole('alert').waitFor()
    state.failList = false
    await page.getByRole('button', { name: '새로고침', exact: true }).click()
    await page.getByRole('alert').waitFor({ state: 'detached' })
    await page.getByLabel('금지 문장 검색').fill('기존 검사')
    await page.getByRole('button', { name: '검색', exact: true }).click()
    await itemRow('색인 실패 문장').waitFor({ state: 'detached' })
    checks.push(
      'Deletion uses revision, pagination uses hasNext, errors recover and keyword search works',
    )
    await page.setViewportSize({ width: 390, height: 844 })
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    await page.getByRole('button', { name: '문장 등록', exact: true }).click()
    await editor.waitFor()
    const bounds = await editor.boundingBox()
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 390)
    await page.screenshot({
      path: 'test-results/counsel/admin-sentences-mobile.png',
      fullPage: true,
    })
    await editor.press('Escape')
    await editor.waitFor({ state: 'detached' })
    assert.equal(
      await page
        .getByRole('button', { name: '문장 등록', exact: true })
        .evaluate((el) => el === document.activeElement),
      true,
    )
    await context.close()

    const customer = await fixture(browser, 'USER')
    activePage = customer.page
    await customer.page.goto(`${origin}/#/admin/counsel-sentences`)
    await customer.page.waitForURL('**/#/auth/login')
    assert.equal(customer.state.requests.length, 0)
    await customer.context.close()
    checks.push('Mobile layout, modal keyboard focus and non-admin access guard work')
    assert.deepEqual(errors, [])
    await writeFile(
      'test-results/counsel/admin-sentences-result.json',
      JSON.stringify({ result: 'PASS', checks, pageErrors: errors }, null, 2),
    )
    console.log('Counsel admin smoke PASS:', checks.length, 'checks')
  } catch (error) {
    if (activePage && !activePage.isClosed())
      await activePage.screenshot({
        path: 'test-results/counsel/admin-sentences-failure.png',
        fullPage: true,
      })
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
