const { installFixtures, pageOf } = require('./fixtures.cjs')

const aiId = '10000000-0000-0000-0000-000000000001'
const counselId = '10000000-0000-0000-0000-000000000002'
const archiveId = '10000000-0000-0000-0000-000000000003'
const sessionId = '20000000-0000-0000-0000-000000000001'
const archiveSessionId = '20000000-0000-0000-0000-000000000002'

async function customerCounsel(context) {
  const fixtures = await installFixtures(context, 'USER')
  const state = {
    current: null,
    ended: null,
    deliveries: [],
    requests: [],
    ends: 0,
    aiRequests: fixtures.requests,
  }
  const archive = {
    sessionId: archiveSessionId,
    conversationId: archiveId,
    status: 'ENDED',
    assignmentVersion: 1,
    lastDeliveredSeq: 1,
  }
  const ok = (route, data) => route.fulfill({ json: { success: true, data } })
  await context.route('**/api/conversations/me?**', (route) =>
    ok(
      route,
      pageOf([
        ...(state.current
          ? [
              {
                conversationId: counselId,
                title: '진행 중인 상담',
                hasCounsel: true,
                lastQuestionAt: '2026-10-25T12:00:00',
              },
            ]
          : []),
        {
          conversationId: aiId,
          title: '기존 요금제 문의',
          hasCounsel: false,
          lastQuestionAt: '2026-10-24T12:00:00',
        },
        {
          conversationId: archiveId,
          title: '지난 상담',
          hasCounsel: true,
          lastQuestionAt: '2026-10-23T12:00:00',
        },
      ]),
    ),
  )
  await context.route('**/api/conversations/*/messages', (route) =>
    ok(
      route,
      route.request().url().includes(aiId)
        ? [{ id: 1, question: '어떤 요금제가 좋을까요?', answer: '기존 AI 답변입니다.' }]
        : [],
    ),
  )
  await context.route('**/api/conversations/*/timeline?**', (route) =>
    ok(route, {
      items: [
        {
          id: 'archive:1',
          cursor: 'archive:1',
          sequence: 1,
          role: 'COUNSELOR',
          content: '지난 상담 답변입니다.',
          source: 'COUNSEL',
          sessionId: archiveSessionId,
          createdAt: '2026-10-23T12:00:00',
        },
      ],
      hasNext: false,
      nextCursor: null,
    }),
  )
  await context.route('**/api/counsel/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const pathname = url.pathname
    if (pathname.endsWith('/requests')) {
      state.requests.push(request.postDataJSON())
      state.current = {
        sessionId,
        conversationId: counselId,
        status: 'WAITING',
        assignmentVersion: 1,
        lastDeliveredSeq: 0,
      }
      return ok(route, state.current)
    }
    if (pathname.endsWith('/current')) return ok(route, state.current)
    if (pathname.includes('/sessions/conversation/')) {
      const id = pathname.split('/').at(-1)
      return ok(
        route,
        id === archiveId ? archive : id === counselId ? (state.current ?? state.ended) : null,
      )
    }
    if (pathname.endsWith('/context')) return ok(route, [])
    if (pathname.endsWith('/end')) {
      state.ends++
      state.ended = { ...state.current, status: 'ENDED' }
      state.current = null
      return ok(route, state.ended)
    }
    if (pathname.endsWith('/messages')) {
      if (request.method() === 'GET') {
        return ok(
          route,
          state.deliveries.filter(
            (message) => message.deliverySequence > Number(url.searchParams.get('afterSequence')),
          ),
        )
      }
      const body = request.postDataJSON()
      const message = {
        messageId: state.deliveries.length + 1,
        deliverySequence: state.deliveries.length + 1,
        mine: true,
        senderRole: 'USER',
        content: body.content,
        createdAt: '2026-10-25T12:00:00',
      }
      state.deliveries.push(message)
      return ok(route, { ...message, status: 'ALLOWED', clientMessageId: body.clientMessageId })
    }
    return ok(route, state.current ?? state.ended)
  })
  return state
}

module.exports = { customerCounsel, aiId, counselId, archiveId }
