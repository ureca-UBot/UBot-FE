const { chromium } = require('playwright')
const { spawn } = require('node:child_process')
const { readFile } = require('node:fs/promises')
const path = require('node:path')
const assert = require('node:assert/strict')
const { assertCounselLayout } = require('./test-support/counsel-layout.cjs')

const beOrigin = 'https://be.example.test'
const token = (suffix, role = 'USER') =>
  `fixture.${Buffer.from(
    JSON.stringify({
      sub: '1',
      role,
      exp: Math.floor(Date.now() / 1000) + 3600,
      suffix,
    }),
  ).toString('base64url')}.fixture`
const initialToken = token('initial')
const refreshedToken = token('refreshed')
const beData = (pathname) =>
  pathname === '/api/conversations/me'
    ? { content: [] }
    : pathname === '/api/notices/banners'
      ? { notices: [], outages: [] }
      : {}

async function build(name, enabled) {
  const outDir = path.resolve('test-results/counsel-pages', name)
  await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ['node_modules/vite/bin/vite.js', 'build', '--outDir', outDir],
      {
        windowsHide: true,
        stdio: 'pipe',
        env: { ...process.env, VITE_API_BASE_URL: beOrigin, VITE_COUNSEL_ENABLED: String(enabled) },
      },
    )
    let output = ''
    child.stdout.on('data', (data) => {
      output += data
    })
    child.stderr.on('data', (data) => {
      output += data
    })
    child.on('error', reject)
    child.on('exit', (code) => (code === 0 ? resolve() : reject(Error(output))))
  })
  return outDir
}

async function openBuild(browser, outDir, siteOrigin, role = 'USER', viewport) {
  const context = await browser.newContext({ viewport })
  await context.addInitScript(
    ({ accessToken }) => {
      sessionStorage.setItem('accessToken', accessToken)
      sessionStorage.setItem('refreshToken', 'refresh-fixture')
      window.cspFailures = []
      document.addEventListener('securitypolicyviolation', (event) =>
        window.cspFailures.push(event.blockedURI),
      )
    },
    { accessToken: role === 'USER' ? initialToken : token('initial', role) },
  )
  await context.route(
    (url) => url.origin === siteOrigin,
    async (route) => {
      const relative =
        new URL(route.request().url()).pathname.replace(/^\/UBot-FE\/?/, '') || 'index.html'
      const file = path.resolve(outDir, relative)
      assert.ok(file.startsWith(outDir + path.sep), 'static file must stay inside test build')
      const contentType = file.endsWith('.js')
        ? 'text/javascript'
        : file.endsWith('.css')
          ? 'text/css'
          : file.endsWith('.png')
            ? 'image/png'
            : 'text/html'
      await route.fulfill({ contentType, body: await readFile(file) })
    },
  )
  const page = await context.newPage()
  page.on('pageerror', (error) => console.error(error.stack))
  return { context, page }
}

async function checkCounselorLayout(browser, outDir, siteOrigin, viewport) {
  const { context, page } = await openBuild(browser, outDir, siteOrigin, 'COUNSELOR', viewport)
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  const history = Array.from({ length: 24 }, (_, index) => ({
    sequence: index + 1,
    role: index % 2 ? 'AI' : 'USER',
    content: `이전 대화 ${index + 1}: 요금제와 가입 방법을 안내해 주세요.`,
    source: 'SAVED',
  }))
  const messages = [
    {
      messageId: 1,
      deliverySequence: 1,
      senderRole: 'USER',
      mine: false,
      content: '긴메시지'.repeat(200),
      createdAt: '2026-10-21T03:00:00Z',
    },
    {
      messageId: 2,
      deliverySequence: 2,
      senderRole: 'COUNSELOR',
      mine: true,
      content: '이전 문의를 확인했습니다.',
      createdAt: '2026-10-21T03:01:00Z',
    },
  ]
  await context.route(
    (url) => url.origin === beOrigin,
    (route) => {
      const url = new URL(route.request().url())
      const pathname = url.pathname
      const after = Number(url.searchParams.get('afterSequence') || 0)
      const data = pathname.endsWith('/current')
        ? {
            sessionId: '00000000-0000-0000-0000-000000000001',
            status: 'ACTIVE',
            assignmentVersion: 1,
          }
        : pathname.endsWith('/heartbeat')
          ? { status: 'AVAILABLE' }
          : pathname.endsWith('/context')
            ? history.filter((item) => item.sequence > after)
            : pathname.endsWith('/messages')
              ? messages.filter((item) => item.deliverySequence > after)
              : beData(pathname)
      return route.fulfill({ json: { success: true, data } })
    },
  )
  try {
    // 새 브라우저 컨텍스트에서 UserApp을 먼저 불러오지 않아도 지연 로딩 라우트가 그려져야 함
    await page.goto(`${siteOrigin}/UBot-FE/#/counselor`)
    await page.getByRole('heading', { name: '상담사 업무 공간' }).waitFor()
    await assertCounselLayout(page, { overflowing: true })
    await page.reload()
    await assertCounselLayout(page, { overflowing: true })
    await page
      .locator('.counsel-messages')
      .evaluate((list) => list.scrollTo({ top: list.scrollHeight, behavior: 'instant' }))
    await page.screenshot({
      path: `test-results/counsel-pages/counselor-${viewport.width}.png`,
      fullPage: true,
    })
    await page.getByRole('link', { name: '← UBot' }).click()
    await page.locator('div.ubot-user-app > main').waitFor()
    await page.goBack()
    await assertCounselLayout(page, { overflowing: true })
    assert.deepEqual(errors, [])
    assert.deepEqual(await page.evaluate(() => window.cspFailures), [])
  } finally {
    await context.close()
  }
}

async function main() {
  const enabledBuild = await build('enabled', true)
  const disabledBuild = await build('disabled', false)
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}),
  })
  try {
    const siteOrigin = 'https://ureca-ubot.github.io'
    const { context, page } = await openBuild(browser, enabledBuild, siteOrigin)
    let refreshCount = 0
    const counselingRequests = []
    await context.route(
      (url) => url.origin === beOrigin,
      async (route) => {
        const pathname = new URL(route.request().url()).pathname
        if (pathname !== '/api/auth/refresh') {
          return route.fulfill({ json: { success: true, data: beData(pathname) } })
        }
        assert.equal(route.request().postDataJSON().refreshToken, 'refresh-fixture')
        refreshCount++
        await route.fulfill({
          json: {
            success: true,
            data: { accessToken: refreshedToken, refreshToken: 'rotated-fixture' },
          },
        })
      },
    )
    await context.route(
      (url) =>
        url.origin === beOrigin &&
        (url.pathname.startsWith('/api/counsel/') ||
          url.pathname.startsWith('/api/admin/counsel/')),
      async (route) => {
        const request = route.request()
        counselingRequests.push(request.url())
        assert.ok(new URL(request.url()).pathname.startsWith('/api/counsel/'))
        const authorization = request.headers().authorization
        if (authorization === `Bearer ${initialToken}`) {
          return route.fulfill({
            status: 401,
            json: { success: false, code: 'JWT-007', message: 'expired' },
          })
        }
        assert.equal(authorization, `Bearer ${refreshedToken}`)
        const data = request.url().endsWith('/current')
          ? {
              sessionId: '00000000-0000-0000-0000-000000000001',
              status: 'ACTIVE',
              assignmentVersion: 1,
            }
          : []
        return route.fulfill({ json: { success: true, data } })
      },
    )
    await page.goto(`${siteOrigin}/UBot-FE/#/counsel`)
    await page.getByText('상담사와 연결되었어요').waitFor()
    await page.getByText('전달된 메시지가 없습니다.').waitFor()
    assert.equal(refreshCount, 1, 'refresh must use the original BE only')
    assert.ok(counselingRequests.length >= 2)
    assert.deepEqual(await page.evaluate(() => window.cspFailures), [])
    assert.ok(
      (
        await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content')
      ).includes(beOrigin),
    )
    await page.screenshot({
      path: 'test-results/counsel-pages/customer-desktop.png',
      fullPage: true,
    })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.screenshot({
      path: 'test-results/counsel-pages/customer-mobile.png',
      fullPage: true,
    })
    await context.close()

    for (const viewport of [
      { width: 1440, height: 1040 },
      { width: 390, height: 844 },
      { width: 320, height: 740 },
    ]) {
      await checkCounselorLayout(browser, enabledBuild, siteOrigin, viewport)
    }

    // 사용자 도메인의 GitHub Pages는 *.github.io 호스트 이름으로 막는 안전장치가 없음
    const disabled = await openBuild(browser, disabledBuild, 'https://support.example.test')
    const forbiddenRequests = []
    await disabled.context.route(
      (url) => url.origin === beOrigin,
      (route) =>
        route.fulfill({
          json: { success: true, data: beData(new URL(route.request().url()).pathname) },
        }),
    )
    disabled.page.on('request', (request) => {
      if (/\/counsel\//.test(new URL(request.url()).pathname)) forbiddenRequests.push(request.url())
    })
    await disabled.page.goto('https://support.example.test/UBot-FE/#/counsel')
    const callButton = disabled.page.getByRole('button', { name: '상담사 호출', exact: true })
    await callButton.waitFor()
    assert.equal(await callButton.isDisabled(), true)
    assert.equal(new URL(disabled.page.url()).hash, '#/ai')
    await disabled.page.waitForTimeout(2500)
    assert.deepEqual(forbiddenRequests, [])
    await disabled.context.close()
    console.log(
      'PASS: production Pages base path, cold counselor route/reload/navigation layout at 1440/390/320px, one BE origin for chat/counsel/auth, CSP, JWT-007 refresh/retry, disabled custom-domain Pages',
    )
  } finally {
    await browser.close()
  }
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
