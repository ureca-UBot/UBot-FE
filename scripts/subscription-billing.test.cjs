const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const fs = require('node:fs/promises')
const { startServer, launchBrowser } = require('./test-support/browser.cjs')
const { installFixtures, pageOf } = require('./test-support/fixtures.cjs')

let server, browser
const ok = (route, data) => route.fulfill({ json: { success: true, data } })
const plan = {
  planId: 1,
  name: 'Ubot 베이직 10GB',
  networkType: 'FIVE_G',
  monthlyFee: 33000,
  dataAmountMb: 10240,
  dataUnlimited: false,
  voiceMinutes: 100,
  voiceUnlimited: false,
  smsCount: 100,
  smsUnlimited: false,
  exhaustedSpeedKbps: null,
}
const secondPlan = {
  ...plan,
  planId: 2,
  name: 'Ubot 데이터 무제한',
  monthlyFee: 55000,
  dataUnlimited: true,
  voiceUnlimited: true,
  smsUnlimited: true,
}
const line = {
  subscriptionId: 1,
  phoneNumber: '010-1234-5678',
  status: 'ACTIVE',
  activatedAt: '2026-10-01',
  planId: 1,
  planName: plan.name,
}
const bills = [
  {
    billingId: 2,
    billingMonth: '2026-09',
    baseFee: 33000,
    addonFee: 3000,
    roamingFee: 0,
    extraFee: 0,
    discountAmount: 1000,
    totalAmount: 35000,
    dueDate: '2026-10-25',
    paymentStatus: 'UNPAID',
    paidAmount: 0,
    paymentMethod: null,
    paidAt: null,
  },
  {
    billingId: 1,
    billingMonth: '2026-08',
    baseFee: 33000,
    addonFee: 0,
    roamingFee: 2000,
    extraFee: 0,
    discountAmount: 0,
    totalAmount: 35000,
    dueDate: '2026-09-25',
    paymentStatus: 'PAID',
    paidAmount: 35000,
    paymentMethod: 'CARD',
    paidAt: '2026-09-24',
  },
]

before(async () => {
  server = await startServer(path.resolve(__dirname, '..'), 4196)
  browser = await launchBrowser()
})
after(async () => {
  await browser?.close()
  server?.close()
})

async function withMyPage(run, width = 1440) {
  const context = await browser.newContext({ viewport: { width, height: 960 } })
  await installFixtures(context, 'USER')
  await context.route('**/api/subscriptions/me', (route) => ok(route, [line]))
  await context.route('**/api/plans?**', (route) => ok(route, pageOf([plan, secondPlan])))
  await context.route('**/api/subscriptions/me/1/**', (route) => {
    const p = new URL(route.request().url()).pathname
    let data = []
    if (p.endsWith('/plan')) data = { summary: plan, tetheringAmountMb: 0 }
    if (p.endsWith('/addons'))
      data = [
        {
          subscriptionAddonId: 1,
          addonServiceId: 1,
          name: '이용 중 안심 서비스',
          status: 'ACTIVE',
          monthlyFee: 3000,
          subscribedAt: '2026-10-01',
          canceledAt: null,
        },
        {
          subscriptionAddonId: 2,
          addonServiceId: 2,
          name: '해지한 서비스',
          status: 'CANCELED',
          monthlyFee: 9000,
          subscribedAt: '2026-09-01',
          canceledAt: '2026-09-20',
        },
      ]
    if (p.endsWith('/usage-records')) data = pageOf([])
    if (p.endsWith('/billing-records')) data = pageOf(bills)
    return ok(route, data)
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  try {
    await page.goto(`${server.origin}/#/my`)
    await page.locator('.member-summary').getByText('36,000원', { exact: true }).waitFor()
    await run({ page, context })
    assert.deepEqual(errors, [])
  } finally {
    await context.close()
  }
}

async function openLine(page) {
  await page.getByRole('button', { name: '회선 개통', exact: true }).click()
  const dialog = page.locator('.subscription-action-form')
  await dialog.getByRole('radio', { name: /Ubot 베이직/ }).waitFor()
  return {
    dialog,
    submit: dialog.getByRole('button', { name: '개통 신청', exact: true }),
    phone: dialog.getByLabel('원하는 번호 (선택)'),
    check: dialog.getByRole('button', { name: '중복 검사', exact: true }),
  }
}

test('예정 요금과 실제 월별 청구·납부 내역을 구분하고 데이터 원은 99.9%로 표시한다', async () => {
  await withMyPage(async ({ page }) => {
    assert.equal(await page.locator('.data-ring-value').getAttribute('stroke-dasharray'), '99.9 .1')
    assert.equal(await page.getByText('해지한 서비스', { exact: true }).count(), 0)
    const billing = page.getByRole('region', { name: '요금·청구 내역' })
    await billing.getByText('요금제 · Ubot 베이직 10GB', { exact: true }).waitFor()
    await billing.getByText('부가서비스 · 이용 중 안심 서비스', { exact: true }).waitFor()
    assert.equal(await billing.getByText('36,000원', { exact: true }).count(), 1)
    await billing.getByRole('button', { name: '청구 내역', exact: true }).click()
    await billing.getByText('미납', { exact: true }).waitFor()
    await billing.getByLabel('청구월').selectOption('1')
    await billing.getByText('납부 완료', { exact: true }).waitFor()
    await billing.getByText('카드', { exact: true }).waitFor()
    await billing.getByText('2026-09-24', { exact: true }).waitFor()
    assert.equal(await billing.getByText('남은 납부액', { exact: true }).count(), 0)
    await billing.getByRole('button', { name: '청구 예정 내역', exact: true }).click()
    await billing.getByText('36,000원', { exact: true }).waitFor()
  })
})

test('개통 요금제는 제공량을 비교해 고르며 번호를 비우면 중복 검사 없이 자동 배정한다', async () => {
  await withMyPage(async ({ page, context }) => {
    let created
    await context.route('**/api/subscriptions/me', (route) => {
      if (route.request().method() !== 'POST') return ok(route, [line])
      created = route.request().postDataJSON()
      return ok(route, line)
    })
    const { dialog, submit } = await openLine(page)
    assert.equal(await submit.isDisabled(), true)
    await dialog.getByLabel('개통 요금제 검색').fill('무제한')
    assert.equal(await dialog.getByRole('radio').count(), 1)
    await dialog.getByRole('radio', { name: /Ubot 데이터 무제한/ }).check()
    await submit.click()
    await page.getByText('010-1234-5678 회선을 개통했습니다.', { exact: true }).waitFor()
    assert.deepEqual(created, { planId: 2 })
  })
})

test('원하는 번호는 중복 검사 후 개통하고 번호 수정 및 개통 시 경합은 재검사를 요구한다', async () => {
  await withMyPage(async ({ page, context }) => {
    const checked = []
    let created = 0
    await context.route('**/api/subscriptions/me/phone-number-availability?**', (route) => {
      const number = new URL(route.request().url()).searchParams.get('phoneNumber')
      checked.push(number)
      return ok(route, { phoneNumber: number, available: number !== '01011112222' })
    })
    await context.route('**/api/subscriptions/me', (route) => {
      if (route.request().method() !== 'POST') return ok(route, [line])
      created++
      return route.fulfill({
        status: 409,
        json: { success: false, code: 'SUB-019', message: '이미 사용 중인 번호입니다.' },
      })
    })
    const { dialog, submit, phone, check } = await openLine(page)
    await dialog.getByRole('radio', { name: /Ubot 베이직/ }).check()
    await phone.fill('01011112222')
    assert.equal(await submit.isDisabled(), true)
    await check.click()
    await dialog
      .getByText('이미 사용 중인 번호입니다. 다른 번호를 입력해 주세요.', { exact: true })
      .waitFor()
    assert.equal(await submit.isDisabled(), true)
    await phone.fill('010-3333-4444')
    await check.click()
    await dialog.getByText('사용할 수 있는 번호입니다.', { exact: true }).waitFor()
    assert.equal(await submit.isEnabled(), true)
    await phone.fill('010-5555-6666')
    assert.equal(await submit.isDisabled(), true)
    await check.click()
    await dialog.getByText('사용할 수 있는 번호입니다.', { exact: true }).waitFor()
    await submit.click()
    await dialog.getByText('이미 사용 중인 번호입니다.', { exact: true }).first().waitFor()
    assert.equal(created, 1)
    assert.equal(await submit.isDisabled(), true)
    assert.deepEqual(checked, ['01011112222', '010-3333-4444', '010-5555-6666'])
  })
})

test('번호 조회 오류와 이전 번호의 지연 응답은 사용 가능으로 처리하지 않는다', async () => {
  await withMyPage(async ({ page, context }) => {
    let release, received
    const arrived = new Promise((resolve) => {
      received = resolve
    })
    const pending = new Promise((resolve) => {
      release = resolve
    })
    await context.route('**/api/subscriptions/me/phone-number-availability?**', async (route) => {
      const number = new URL(route.request().url()).searchParams.get('phoneNumber')
      if (number === '01011112222') {
        received()
        await pending
        return ok(route, { phoneNumber: number, available: true })
      }
      return route.fulfill({
        status: 503,
        json: { success: false, message: '번호 조회를 다시 시도해 주세요.' },
      })
    })
    const { dialog, submit, phone, check } = await openLine(page)
    await dialog.getByRole('radio', { name: /Ubot 베이직/ }).check()
    await phone.fill('01011112222')
    await check.click()
    await arrived
    await phone.fill('01033334444')
    release()
    await check.click()
    await dialog.getByText('번호 조회를 다시 시도해 주세요.', { exact: true }).waitFor()
    assert.equal(await submit.isDisabled(), true)
    assert.equal(await dialog.getByText('사용할 수 있는 번호입니다.', { exact: true }).count(), 0)
    await phone.fill('')
    assert.equal(await submit.isEnabled(), true)
  })
})

test('320px부터 청구 내역·개통 창이 잘리지 않고 로고 배경은 투명하다', async () => {
  for (const width of [1440, 768, 390, 320]) {
    await withMyPage(async ({ page }) => {
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        true,
      )
      const imageAlpha = await page.locator('.utility-brand img').evaluate(async (img) => {
        await img.decode()
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        return ctx.getImageData(0, 0, 1, 1).data[3]
      })
      assert.equal(imageAlpha, 0)
      const output = process.env.TEST_REVIEW_DIR
      if (output) {
        await fs.mkdir(output, { recursive: true })
        await page
          .locator('.member-summary')
          .screenshot({ path: path.join(output, `summary-${width}.png`) })
        await page
          .locator('.my-billing')
          .screenshot({ path: path.join(output, `billing-${width}.png`) })
        await page
          .locator(width < 768 ? '.mobile-header' : '.desktop-header')
          .screenshot({ path: path.join(output, `header-${width}.png`) })
      }
      const { dialog } = await openLine(page)
      await dialog.getByRole('radio', { name: /Ubot 베이직/ }).check()
      assert.equal(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1), true)
      if (output) await dialog.screenshot({ path: path.join(output, `open-${width}.png`) })
    }, width)
  }
})
