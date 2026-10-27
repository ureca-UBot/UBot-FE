const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const { startServer, launchBrowser } = require('./test-support/browser.cjs')
const { installFixtures, pageOf } = require('./test-support/fixtures.cjs')

let server, browser
before(async () => {
  server = await startServer(path.resolve(__dirname, '..'), 4192)
  browser = await launchBrowser()
})
after(async () => {
  await browser?.close()
  server?.close()
})

const notice = {
  noticeId: 1,
  type: 'NOTICE',
  title: '새 서비스 안내',
  content: '등록한 내용을 확인하세요.',
  targetRegion: null,
  createdAt: '2026-10-25T12:00:00',
  endsAt: null,
}
const ok = (route, data) => route.fulfill({ json: { success: true, data } })

test('관리자 등록·수정·삭제 후 같은 화면과 다른 탭의 배너를 캐시 대기 없이 갱신한다', async () => {
  const context = await browser.newContext()
  await installFixtures(context, 'ADMIN')
  let notices = []
  let reads = 0
  await context.route('**/api/notices/banners', (route) => {
    reads++
    return ok(route, { region: null, notices, outages: [] })
  })
  await context.route('**/api/admin/notices**', (route) => {
    const request = route.request()
    if (request.method() === 'GET')
      return ok(route, pageOf(notices.map((detail) => ({ detail, metadata: {} }))))
    notices = request.method() === 'DELETE' ? [] : [{ ...notice, ...request.postDataJSON() }]
    return ok(route, { detail: notices[0] })
  })
  try {
    const user = await context.newPage()
    const admin = await context.newPage()
    await user.goto(`${server.origin}/#/notices`)
    await user.getByText('총 1건', { exact: true }).waitFor()
    const initialReads = reads
    await admin.goto(`${server.origin}/#/admin/notices`)
    await admin.evaluate(async (request) => {
      const { adminNoticeApi } = await import('/src/admin/notice/api/noticeApi.ts')
      await adminNoticeApi.createNotice(request)
    }, notice)
    await user.locator('.notice-banner__title').getByText(notice.title, { exact: true }).waitFor()
    assert.ok(reads > initialReads)
    await user.getByRole('button', { name: '공지 안내 닫기' }).click()
    assert.equal(await user.locator('.notice-banners').count(), 0)
    await user.evaluate(
      async (request) => {
        const { adminNoticeApi } = await import('/src/admin/notice/api/noticeApi.ts')
        await adminNoticeApi.updateNotice(1, request)
      },
      { ...notice, title: '수정한 서비스 안내' },
    )
    await user
      .locator('.notice-banner__title')
      .getByText('수정한 서비스 안내', { exact: true })
      .waitFor()
    await admin.evaluate(async () => {
      const { adminNoticeApi } = await import('/src/admin/notice/api/noticeApi.ts')
      await adminNoticeApi.deleteNotice(1)
    })
    await user.locator('.notice-banners').waitFor({ state: 'detached' })
    // 관리자 화면에 있는 동안에는 배너 구독자가 없으므로, 돌아올 때도 캐시 버전을 확인해야 합니다.
    await user.goto(`${server.origin}/#/admin/notices`)
    await user.locator('.admin-layout').waitFor()
    await user.evaluate(
      async (request) => {
        const { adminNoticeApi } = await import('/src/admin/notice/api/noticeApi.ts')
        await adminNoticeApi.createNotice(request)
      },
      { ...notice, title: '관리자 화면에서 등록한 공지' },
    )
    await user.goto(`${server.origin}/#/notices`)
    await user
      .locator('.notice-banner__title')
      .getByText('관리자 화면에서 등록한 공지', { exact: true })
      .waitFor()
  } finally {
    await context.close()
  }
})

test('공지·장애는 종료 시각에 숨기고 무기한 공지는 유지하며 서버 실패에도 만료시킨다', async () => {
  const context = await browser.newContext()
  await installFixtures(context)
  await context.addInitScript(() => {
    Date.now = () => Math.floor(performance.timeOrigin + performance.now())
  })
  let reads = 0
  await context.route('**/api/notices/banners', (route) => {
    reads++
    if (reads > 1) return route.fulfill({ status: 503, json: { success: false } })
    const endsAt = new Date(Date.now() + 1500).toISOString()
    return ok(route, {
      region: null,
      notices: [
        { ...notice, endsAt },
        { ...notice, noticeId: 2, title: '계속 노출하는 공지' },
        { ...notice, noticeId: 3, title: '이미 끝난 공지', endsAt: '2000-01-01T00:00:00' },
      ],
      outages: [{ ...notice, noticeId: 4, type: 'OUTAGE', title: '통신 점검', endsAt }],
    })
  })
  try {
    const page = await context.newPage()
    await page.goto(`${server.origin}/#/notices`)
    await page.locator('.notice-banner--outage').waitFor()
    assert.equal(await page.locator('.notice-banner__title').getByText('이미 끝난 공지').count(), 0)
    await page.evaluate(async () => {
      const { refreshNoticeBanners } = await import('/src/user/notice/hooks/useNoticeBanners.ts')
      refreshNoticeBanners()
    })
    await page.locator('.notice-banner--outage').waitFor({ state: 'detached' })
    await page
      .locator('.notice-banner__title')
      .getByText('계속 노출하는 공지', { exact: true })
      .waitFor()
    assert.equal(await page.locator('.notice-banner__title').count(), 1)
  } finally {
    await context.close()
  }
})
