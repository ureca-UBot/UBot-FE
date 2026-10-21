const path = require('node:path')
const fs = require('node:fs/promises')
const assert = require('node:assert/strict')
const { PNG } = require('pngjs')
const { startServer, launchBrowser, sleep } = require('./test-support/browser.cjs')
const { installFixtures } = require('./test-support/fixtures.cjs')
const { prepareBaseline } = require('./test-support/baseline.cjs')

const root = path.resolve(__dirname, '..')
const out = path.join(root, 'test-results/refactor-visual')
const cases = [
  ...[
    '/',
    '/store',
    '/store/product',
    '/my',
    '/benefits',
    '/support',
    '/support/store-address',
    '/notices',
    '/ai',
    '/auth/login',
    '/auth/signup',
  ].map((route) => ({ route, role: null })),
  { route: '/my', role: 'USER' },
  { route: '/ai', role: 'USER' },
  ...[
    'dashboard',
    'operation',
    'faqs',
    'faqs/deleted',
    'faqs/categories',
    'faqs/1',
    'products/plans',
    'products/bundle-products',
    'products/addon-services',
    'products/roaming-products',
    'stores',
    'forbidden-words',
    'unanswered-groups',
    'reservations',
    'notices',
    'inquiries',
    'guest-chat-settings',
    'embedding-backfill',
  ].map((route) => ({ route: `/admin/${route}`, role: 'ADMIN' })),
  { route: '/admin/faqs', role: 'ADMIN', action: 'faq-create' },
  { route: '/admin/products/plans', role: 'ADMIN', action: 'plan-create' },
  { route: '/admin/inquiries', role: 'ADMIN', action: 'inquiry-detail' },
  { route: '/my', role: 'USER', action: 'inquiry-create' },
]

function compare(a, b) {
  const left = PNG.sync.read(a),
    right = PNG.sync.read(b)
  if (left.width !== right.width || left.height !== right.height) {
    return {
      matching: false,
      dimensions: [
        [left.width, left.height],
        [right.width, right.height],
      ],
    }
  }
  let changed = 0
  for (let i = 0; i < left.data.length; i += 4) {
    if ([0, 1, 2].some((c) => Math.abs(left.data[i + c] - right.data[i + c]) > 16)) changed++
  }
  return {
    matching: changed === 0,
    changedPixels: changed,
    ratio: changed / (left.width * left.height),
  }
}

async function capture(browser, origin, test, width) {
  const context = await browser.newContext({
    viewport: { width, height: width < 768 ? 844 : 960 },
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    reducedMotion: 'reduce',
  })
  const fixtures = await installFixtures(context, test.role)
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  try {
    await page.goto(`${origin}/#${test.route}`)
    await page.locator('main').first().waitFor()
    await sleep(test.route.includes('dashboard') || test.route.includes('operation') ? 1800 : 350)
    if (test.action === 'faq-create')
      await page.getByRole('button', { name: 'FAQ 생성', exact: true }).click()
    if (test.action === 'plan-create')
      await page.getByRole('button', { name: '요금제 등록', exact: true }).click()
    if (test.action === 'inquiry-detail')
      await page.getByRole('button', { name: '보기', exact: true }).click()
    if (test.action === 'inquiry-create')
      await page.getByRole('button', { name: '문의하기', exact: true }).click()
    await page.evaluate(() => document.fonts.ready)
    // Compare the neutral design; keyboard focus is verified by interaction tests.
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    })
    await sleep(100)
    const text = await page.locator('body').innerText()
    const screenshot = await page.screenshot({ fullPage: true, animations: 'disabled' })
    return { screenshot, text, errors, unknown: fixtures.unknown }
  } finally {
    await context.close()
  }
}

async function main() {
  await fs.mkdir(out, { recursive: true })
  let before, after, browser
  const report = []
  try {
    before = await startServer(prepareBaseline(root), 4180)
    after = await startServer(root, 4181)
    browser = await launchBrowser()
    for (const width of [1280, 390]) {
      for (const test of cases.filter(
        (test) => width === 1280 || !test.route.startsWith('/admin/'),
      )) {
        const name = `${width}-${test.role || 'guest'}-${test.route.replaceAll('/', '_')}${test.action ? '-' + test.action : ''}`
        if (process.env.VISUAL_CASE && !name.includes(process.env.VISUAL_CASE)) continue
        const original = await capture(browser, before.origin, test, width)
        const updated = await capture(browser, after.origin, test, width)
        const pixels = compare(original.screenshot, updated.screenshot)
        const record = {
          name,
          ...pixels,
          sameText: original.text === updated.text,
          baselineErrors: original.errors,
          currentErrors: updated.errors,
          unknown: [...new Set([...original.unknown, ...updated.unknown])],
        }
        report.push(record)
        await fs.writeFile(path.join(out, `${name}-before.png`), original.screenshot)
        await fs.writeFile(path.join(out, `${name}-after.png`), updated.screenshot)
        await fs.writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2))
        console.log(JSON.stringify(record))
      }
    }
    assert.ok(
      report.every((row) => row.matching && row.sameText && row.currentErrors.length === 0),
      'Screenshots, visible text and page errors must match the develop baseline',
    )
  } finally {
    await browser?.close()
    before?.close()
    after?.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
