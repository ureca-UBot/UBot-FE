const at = '2026-10-20T12:00:00'
const pageOf = (content = []) => ({
  content,
  number: 0,
  size: 20,
  totalElements: content.length,
  totalPages: content.length ? 1 : 0,
  first: true,
  last: true,
})
const faq = {
  id: 1,
  categoryId: 1,
  question: '요금제 변경 방법',
  answer: 'MY에서 요금제를 확인해 주세요.',
  intent: 'GENERAL',
  cacheable: false,
  similarQuestions: [],
  version: 1,
  adminId: 99,
  updatedAt: at,
}
const notice = {
  noticeId: 1,
  type: 'NOTICE',
  title: '서비스 이용 안내',
  content: '서비스 이용에 참고해 주세요.',
  targetRegion: null,
  endsAt: null,
  createdAt: at,
}
const metadata = { createdBy: 99, updatedBy: 99, createdAt: at, updatedAt: at, deletedAt: null }
const store = {
  storeId: 1,
  storeName: '강남점',
  sido: '서울',
  sigungu: '강남구',
  address: '서울 강남구 테헤란로 1',
  latitude: 37.5,
  longitude: 127.0,
  phoneNumber: '02-000-0000',
  businessHours: '09:00~18:00',
  services: [],
  active: true,
  createdAt: at,
  updatedAt: at,
}
const profile = {
  id: 1,
  email: 'fixture@example.test',
  name: '검증회원',
  birthDate: '1995-01-01',
  gender: 'MALE',
  residenceArea: '서울',
  role: 'USER',
  createdAt: at,
}
const item = {
  faqId: 1,
  question: faq.question,
  intent: 'GENERAL',
  count: 12,
  averageSimilarity: 0.85,
}
const rank = { top: [item], low: [item] }
const monitoring = {
  unansweredQuestionSummary: {
    totalQuestionCount: 120,
    unansweredQuestionCount: 12,
    unansweredRate: 0.1,
  },
  faqUsageRanking: { all: rank, general: rank, userData: rank, storeData: rank },
  faqSimilarityRanking: {
    overallAverageSimilarity: 0.85,
    all: rank,
    general: rank,
    userData: rank,
    storeData: rank,
  },
}
const improvement = {
  faqId: 1,
  question: faq.question,
  intent: 'GENERAL',
  faqVersion: 1,
  versionStartedAt: at,
  improvementTypes: ['DUPLICATE_SUSPECTED'],
  topKCount: 10,
  averageSimilarity: 0.85,
  top1SampleCount: 12,
  recentUsageCount: 5,
  averageTopGap: 0.03,
  lowGapRate: 0.1,
}
const detail = {
  basicInfo: {
    faqId: 1,
    question: faq.question,
    answer: faq.answer,
    categoryName: '이용 안내',
    intent: 'GENERAL',
    version: 1,
    createdAt: at,
    updatedAt: at,
  },
  usageTrend: {
    period: 'MONTH',
    periodStart: at,
    periodEnd: at,
    totalCount: 12,
    points: [{ bucketStart: '2026-10-01T00:00:00', bucketEnd: at, faqVersion: 1, count: 12 }],
  },
  similarity: { averageSimilarity: 0.85, sampleCount: 12 },
  top1: { top1Count: 10, top1Rate: 0.8, overallAverageTop1Count: 5 },
  topGap: { averageGap: 0.03, sampleCount: 12 },
  cooccurringFaqs: [],
}
const points = [{ at, value: 1 }]
const overview = {
  window: { range: '6h', from: at, to: at, sampleIntervalSeconds: 60 },
  services: { backend: 'UP', postgres: 'UP', redis: 'UP' },
  summary: {
    apiRps: 12,
    api5xxRate: 0,
    apiP95Millis: 120,
    jvmHeapUsageRate: 0.4,
    databasePool: { active: 2, idle: 8, pending: 0, max: 10 },
  },
  series: {
    apiRps: points,
    errorRate: { client4xx: points, server5xx: points },
    apiLatencyMillis: { p50: points, p95: points, p99: points },
    backend: {
      cpuUsageRate: points,
      jvmHeapUsageRate: points,
      gcPauseSecondsPerSecond: points,
      liveThreads: points,
    },
    databasePool: { active: points, idle: points, pending: points },
    containers: { cpuUsageRate: { api: points }, memoryBytes: { api: points } },
  },
}

function token(role, id = role === 'ADMIN' ? '99' : '1') {
  return `fixture.${Buffer.from(JSON.stringify({ sub: id, role, exp: 2_000_000_000 })).toString('base64url')}.fixture`
}

async function installFixtures(context, role = null) {
  const requests = []
  const unknown = []
  const state = {
    inquiry: {
      id: 1,
      title: '이용 문의',
      content: '이용 방법이 궁금합니다.',
      status: 'RECEIVED',
      adminReply: null,
      createdAt: at,
      updatedAt: at,
      resolvedAt: null,
    },
    faqs: [faq],
    profile: { ...profile },
    settings: { maxQuestionCount: 3, updatedBy: 99, updatedAt: at },
  }
  await context.addInitScript(
    ({ accessToken }) => {
      // Fixed display time, while timers and performance.now keep advancing normally.
      const RealDate = Date
      class FixedDate extends RealDate {
        constructor(...args) {
          super(...(args.length ? args : ['2026-10-20T12:00:00Z']))
        }
        static now() {
          return new RealDate('2026-10-20T12:00:00Z').getTime()
        }
      }
      window.Date = FixedDate
      if (accessToken) {
        sessionStorage.setItem('accessToken', accessToken)
        sessionStorage.setItem('refreshToken', 'fixture-refresh')
      }
    },
    { accessToken: role ? token(role) : null },
  )

  await context.route(
    (url) => url.pathname.startsWith('/api/'),
    async (route) => {
      const req = route.request(),
        url = new URL(req.url()),
        p = url.pathname,
        method = req.method()
      const body = method === 'GET' ? undefined : req.postDataJSON()
      requests.push({ path: p, query: url.search, method, body })
      const ok = (data) => route.fulfill({ json: { success: true, code: 'SUCCESS', data } })
      if (p === '/api/auth/login')
        return ok({ accessToken: token('USER'), refreshToken: 'fixture-refresh' })
      if (p === '/api/auth/logout') return ok(null)
      if (p === '/api/auth/me') {
        if (body) Object.assign(state.profile, body)
        return ok(state.profile)
      }
      if (p === '/api/notices/banners') return ok({ notices: [], outages: [] })
      if (p === '/api/notices') return ok(pageOf([notice]))
      if (p === '/api/notices/1') return ok(notice)
      if (p === '/api/rankings')
        return ok({
          popular: {
            calculatedAt: at,
            rankings: [
              { rank: 1, faqId: 1, question: faq.question, answer: faq.answer, currentCount: 12 },
            ],
          },
          trend: null,
          regionalTrend: {},
        })
      if (
        p === '/api/subscriptions/me' ||
        p === '/api/reservations/me' ||
        p === '/api/notifications/me'
      )
        return ok([])
      if (p.endsWith('/unread-count')) return ok({ unreadCount: 0 })
      if (
        method === 'GET' &&
        (p === '/api/counsel/sessions/current' ||
          /^\/api\/counsel\/sessions\/conversation\/[^/]+$/.test(p))
      )
        return ok(null)
      if (p === '/api/conversations/me')
        return ok(
          pageOf([{ conversationId: 'conversation-1', title: '저장된 대화', lastQuestionAt: at }]),
        )
      if (p.endsWith('/conversation-1/messages'))
        return ok([{ question: '기존 질문', answer: '기존 답변' }])
      if (p === '/api/chat/questions')
        return ok({
          jobId: 1,
          status: 'QUEUED',
          conversationId: 'conversation-2',
          idempotencyKey: 'fixture-key',
          attemptCount: 1,
        })
      if (p === '/api/chat/jobs/1')
        return ok({
          jobId: 1,
          status: 'SUCCEEDED',
          answer: '검증용 AI 답변입니다.',
          idempotencyKey: 'fixture-key',
          attemptCount: 1,
          retryable: false,
        })
      if (p === '/api/inquiries') {
        if (method === 'POST') Object.assign(state.inquiry, body)
        return ok(method === 'GET' ? pageOf([state.inquiry]) : state.inquiry)
      }
      if (p === '/api/inquiries/1') {
        if (body) Object.assign(state.inquiry, body)
        return ok(state.inquiry)
      }
      if (p === '/api/admin/inquiries')
        return ok(
          pageOf([{ inquiry: state.inquiry, userId: 1, userName: '검증회원', resolvedById: null }]),
        )
      if (p.startsWith('/api/admin/inquiries/')) {
        if (method === 'PATCH')
          Object.assign(state.inquiry, {
            status: 'RESOLVED',
            adminReply: body.reply,
            resolvedAt: at,
          })
        return ok({
          inquiry: state.inquiry,
          userId: 1,
          userName: '검증회원',
          resolvedById: method === 'PATCH' ? 99 : null,
        })
      }
      if (p === '/api/admin/faq-monitoring') return ok(monitoring)
      if (p === '/api/admin/faq-monitoring/improvements')
        return ok({ ...pageOf(), items: [improvement], evaluatedAt: at, page: 0, totalPages: 1 })
      if (p.endsWith('/duplicates'))
        return ok([{ faqId: 2, question: '비슷한 질문', top1Count: 3, pairCount: 2 }])
      if (p.startsWith('/api/admin/faq-monitoring/faqs/')) return ok(detail)
      if (p.endsWith('/services/overview')) return ok(overview)
      if (p.endsWith('/services/endpoints'))
        return ok({
          window: overview.window,
          items: [
            {
              uri: '/api/chat',
              rps: 1,
              requestCount: 10,
              client4xxRate: 0,
              server5xxRate: 0,
              p50Millis: 10,
              p95Millis: 20,
              p99Millis: 30,
            },
          ],
        })
      if (p === '/api/admin/faq-categories')
        return ok(pageOf([{ faqCategoryId: 1, name: '이용 안내' }]))
      if (p === '/api/admin/faqs') {
        if (method === 'POST') state.faqs.push({ ...faq, ...body, id: 2 })
        if (method === 'PATCH') Object.assign(state.faqs[0], body)
        return ok(method === 'GET' ? pageOf(state.faqs) : state.faqs.at(-1))
      }
      if (p === '/api/admin/faqs/1') return ok(faq)
      if (
        p === '/api/admin/deleted-faqs' ||
        p.includes('/api/admin/old-faqs') ||
        p.includes('/api/admin/faq-logs')
      )
        return ok(pageOf())
      if (p === '/api/admin/forbidden-words')
        return ok(
          pageOf([{ id: 1, word: '검증금지어', status: 'ACTIVE', createdAt: at, updatedAt: at }]),
        )
      if (p === '/api/admin/unanswered-groups')
        return ok(
          pageOf([
            {
              id: 1,
              representativeQuestion: '미처리 질문',
              questionCount: 3,
              relatedFaqId: null,
              resolvedFaqId: null,
              status: 'PENDING',
              lastOccurredAt: at,
            },
          ]),
        )
      if (p.includes('/regions/sidos')) return ok(['서울'])
      if (p.includes('/regions/sigungus')) return ok(['강남구'])
      if (p === '/api/admin/stores') return ok(pageOf([store]))
      if (p === '/api/admin/stores/1') return ok(store)
      if (p === '/api/admin/reservations') return ok(pageOf())
      if (p === '/api/admin/notices') return ok(pageOf([{ detail: notice, metadata }]))
      if (p === '/api/admin/notices/1') return ok({ detail: notice, metadata })
      if (p === '/api/admin/guest-chat-settings') {
        if (body) Object.assign(state.settings, body)
        return ok(state.settings)
      }
      if (/^\/api\/(admin\/)?(plans|bundle-products|addon-services|roaming-products)$/.test(p))
        return ok(pageOf())
      unknown.push(p)
      return route.fulfill({
        status: 404,
        json: { success: false, message: `Missing fixture: ${p}` },
      })
    },
  )
  return { requests, unknown, state }
}

module.exports = { installFixtures, token, pageOf, faq }
