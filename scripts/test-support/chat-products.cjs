const { installFixtures, pageOf } = require('./fixtures.cjs')

const group = (key, label, anyAllowed, options, selected = null) => ({
  key,
  label,
  anyAllowed,
  selected,
  options: options.map(([value, text]) => ({ value, label: text })),
})
const refine = {
  type: 'PLAN',
  keyword: null,
  total: 35,
  groups: [
    group('networkType', '네트워크', true, [
      ['FIVE_G', '5G'],
      ['LTE', 'LTE'],
    ]),
    group('targetGroup', '대상', true, [
      ['GENERAL', '일반'],
      ['YOUTH', '청년'],
    ]),
    group('maxMonthlyFee', '월정액', true, [
      ['30000', '3만원 이하'],
      ['50000', '5만원 이하'],
    ]),
    group('data', '데이터', true, [
      ['50', '50GB 이상'],
      ['UNLIMITED', '무제한만'],
    ]),
    group(
      'sortBy',
      '정렬',
      false,
      [
        ['MONTHLY_FEE_ASC', '월정액 낮은 순'],
        ['DATA_DESC', '데이터 많은 순'],
      ],
      'MONTHLY_FEE_ASC',
    ),
  ],
}
const products = [
  {
    type: 'PLAN',
    name: '테스트 5G 무제한',
    fee: 49000,
    network: '5G',
    specs: ['데이터 무제한', '음성·문자 기본 제공'],
    highlights: ['월정액 5만원 이하로 이용하세요.'],
  },
  {
    type: 'PLAN',
    name: '테스트 LTE 50GB',
    fee: 39000,
    network: 'LTE',
    specs: ['데이터 50GB'],
    highlights: [],
  },
]
const plan = {
  planId: 31,
  name: products[0].name,
  networkType: 'FIVE_G',
  targetGroup: 'GENERAL',
  monthlyFee: 49000,
  dataUnlimited: true,
  voiceUnlimited: true,
  smsUnlimited: true,
  dataAmountMb: null,
  exhaustedSpeedKbps: null,
  voiceMinutes: null,
  smsCount: null,
}
const ok = (route, data) => route.fulfill({ json: { success: true, data } })

async function installProductChat(context, config = {}) {
  const fixtures = await installFixtures(context, config.role === undefined ? 'USER' : config.role)
  const data = config.data ?? { products: [], refine }
  const requests = { options: [], searches: [], questions: [], catalog: [] }
  await context.route('**/api/chat/questions', (route) => {
    requests.questions.push(route.request().postDataJSON())
    return ok(route, {
      jobId: 1,
      status: 'QUEUED',
      conversationId: config.conversationId,
      idempotencyKey: 'products-key',
      attemptCount: 1,
    })
  })
  await context.route('**/api/chat/jobs/*', (route) =>
    ok(route, {
      jobId: 1,
      status: 'SUCCEEDED',
      answer: '필요한 상품 조건을 선택해 주세요.',
      productData: data,
      idempotencyKey: 'products-key',
      attemptCount: 1,
      retryable: false,
      ...config.responseFields,
    }),
  )
  await context.route('**/api/chat/product-search/options', async (route) => {
    const body = route.request().postDataJSON()
    requests.options.push({ ...body, authorization: route.request().headers().authorization })
    if (config.optionHandler && (await config.optionHandler(route, body))) return
    const current = data.refine.groups.find((item) => item.key === body.key)
    return ok(route, {
      key: body.key,
      anyAvailable: true,
      options: current.options.map(({ value }) => ({
        value,
        available: value !== '30000' && value !== 'YOUTH',
      })),
    })
  })
  await context.route('**/api/chat/product-search', async (route) => {
    const body = route.request().postDataJSON()
    requests.searches.push(body)
    if (config.searchHandler && (await config.searchHandler(route, body))) return
    return ok(route, { answer: '조건에 맞는 상품입니다.', productData: { products, refine: null } })
  })
  await context.route('**/api/plans?**', (route) => {
    const url = new URL(route.request().url())
    requests.catalog.push(Object.fromEntries(url.searchParams))
    if (config.catalogHandler) return config.catalogHandler(route, url)
    return ok(route, pageOf([plan]))
  })
  await context.route('**/api/plans/31', (route) =>
    ok(route, {
      summary: plan,
      description: '검증용 상품 정보입니다.',
      tetheringAmountMb: 10240,
      minAge: null,
      maxAge: null,
    }),
  )
  await context.route('**/api/plans/31/included-addons', (route) => ok(route, []))
  return { fixtures, requests }
}

module.exports = { refine, group, products, plan, ok, installProductChat }
