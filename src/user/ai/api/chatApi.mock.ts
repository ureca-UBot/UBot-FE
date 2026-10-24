import { ApiRequestError } from '../../../shared/api/client'
import type {
  ChatBillingCard,
  ChatPlanCard,
  ChatProductCard,
  ChatProductData,
  ChatStoreMap,
  ChatUsageCard,
  ChatUsageRecord,
  ChatUserData,
} from '../types/chat'
import type { ChatApi } from './chatApi'
import type { ChatWaitOptions } from './chatJobPolling'

// 백엔드 없이 화면만 확인하기 위한 개발용 mock입니다.
// .env.local에 VITE_CHAT_MOCK=true를 넣고 개발 서버를 실행했을 때만 사용합니다.
// 재검색 API가 병합되어 실제 연동을 확인한 뒤에는 이 파일과 chatApi.ts의 스위치를 제거합니다.

let nextMockJobId = 0

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// 실제 API처럼 대기 → 검색 → 생성 단계를 차례로 알립니다.
async function simulateProgress(totalMs: number, options?: ChatWaitOptions) {
  const step = totalMs / 3
  options?.signal?.throwIfAborted()
  options?.onProgress?.({ status: 'QUEUED', phase: 'WAITING', remainingMs: 10 * 60_000 })
  await wait(step)
  options?.signal?.throwIfAborted()
  options?.onProgress?.({ status: 'RUNNING', phase: 'SEARCHING', remainingMs: 3 * 60_000 })
  await wait(step)
  options?.signal?.throwIfAborted()
  options?.onProgress?.({ status: 'RUNNING', phase: 'GENERATING', remainingMs: 3 * 60_000 })
  await wait(step)
  options?.signal?.throwIfAborted()
}

// 채팅 지도 드로어 확인용: '매장'이 들어간 질문에는 강남역 기준 매장 조회 결과를 함께 돌려줍니다. (V5 매장 데이터)
const MOCK_STORE_MAP: ChatStoreMap = {
  center: { latitude: 37.497942, longitude: 127.027621 },
  placeName: '강남역',
  radiusKm: 3,
  stores: [
    {
      storeId: 214,
      storeName: '서초2동_강남역6번출구점',
      sido: '서울특별시',
      sigungu: '서초구',
      address: '서울특별시 서초구 강남대로 375 101호(서초동,서초현대타워아파트)',
      phoneNumber: '000-0000-0214',
      businessHours: '09:00-18:00',
      latitude: 37.4964212,
      longitude: 127.027788,
      distanceKm: 0.17,
    },
    {
      storeId: 208,
      storeName: '일상의틈_역삼동_강남역12번출구점',
      sido: '서울특별시',
      sigungu: '강남구',
      address: '서울특별시 강남구 테헤란로 107 1층 (역삼동, 메디타워)',
      phoneNumber: '000-0000-0208',
      businessHours: '09:00-18:00',
      latitude: 37.4986915,
      longitude: 127.028637,
      distanceKm: 0.12,
    },
    {
      storeId: 201,
      storeName: '역삼동_역삼역점',
      sido: '서울특별시',
      sigungu: '강남구',
      address: '서울특별시 강남구 논현로 511 1층(역삼동,에이치에스빌딩)',
      phoneNumber: '000-0000-0201',
      businessHours: '09:00-18:00',
      latitude: 37.5022215,
      longitude: 127.035955,
      distanceKm: 0.87,
    },
  ],
}

// 가입 정보 카드 확인용: 질문 키워드에 따라 요금제·사용량·청구서 카드를 돌려줍니다. (BE 연동 안내 문서의 예시 수치)
// "요금제" → 요금제 / "청구" → 2개월 비교표 / "3개월" → 청구서 3개월 막대 / "사용량" → 사용량 4개월 막대 / "회선" → 회선 2개
const MOCK_PHONE = '010-****-1234'
const MOCK_PHONE_2 = '010-****-5678'
const GB = 1024

// BE LocalDate와 같은 "2026-10-25" 형식의 로컬 날짜입니다.
const toLocalDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

const mockPlan = (
  phoneNumber: string,
  name: string,
  monthlyFee: number,
  dataAmountMb: number | null,
): ChatPlanCard => ({
  phoneNumber,
  plan: {
    summary: {
      planId: phoneNumber === MOCK_PHONE ? 11 : 12,
      planCode: 'MOCK',
      name,
      networkType: 'FIVE_G',
      targetGroup: phoneNumber === MOCK_PHONE ? 'GENERAL' : 'YOUTH',
      monthlyFee,
      dataAmountMb,
      dataUnlimited: dataAmountMb === null,
      exhaustedSpeedKbps: dataAmountMb === null ? null : 1000,
      voiceMinutes: null,
      voiceUnlimited: true,
      smsCount: null,
      smsUnlimited: true,
    },
    description: null,
    tetheringAmountMb: null,
    minAge: null,
    maxAge: null,
  },
})

const mockUsage = (
  billingMonth: string,
  dataUsedMb: number,
  dataAmountMb: number | null,
  overrides: Partial<ChatUsageRecord> = {},
): ChatUsageRecord => ({
  billingMonth,
  dataUsedMb,
  voiceUsedMinutes: 180,
  smsUsedCount: 8,
  allowance: {
    dataAmountMb,
    dataUnlimited: dataAmountMb === null,
    voiceMinutes: 300,
    voiceUnlimited: false,
    smsCount: 100,
    smsUnlimited: false,
  },
  remainingDataMb: dataAmountMb === null ? null : Math.max(0, dataAmountMb - dataUsedMb),
  remainingVoiceMinutes: 120,
  remainingSmsCount: 92,
  aggregatedThroughDate: null,
  finalized: true,
  finalizedAt: `${billingMonth}-28T00:00:00Z`,
  fullMonthActive: true,
  ...overrides,
})

const mockBilling = (
  phoneNumber: string,
  billingMonth: string,
  roamingFee: number,
  extraFee: number,
  paid: boolean,
): ChatBillingCard => {
  const baseFee = 55_000,
    addonFee = 3_300,
    discountAmount = 13_750
  const month = Number(billingMonth.split('-')[1])
  return {
    phoneNumber,
    usageMonth: month === 1 ? 12 : month - 1,
    billing: {
      billingMonth,
      baseFee,
      addonFee,
      roamingFee,
      extraFee,
      discountAmount,
      totalAmount: baseFee + addonFee + roamingFee + extraFee - discountAmount,
      dueDate: `${billingMonth}-25`,
      paymentStatus: paid ? 'PAID' : 'UNPAID',
      paidAmount: paid ? baseFee + addonFee + roamingFee + extraFee - discountAmount : null,
      paymentMethod: paid ? 'AUTO_TRANSFER' : null,
      paidAt: paid ? `${billingMonth}-25T09:00:00Z` : null,
    },
  }
}

function mockUserData(question: string): ChatUserData | null {
  // 집계일은 BE가 보내는 값입니다. mock은 질문한 날까지 집계한 것으로 둡니다.
  const today = toLocalDate(new Date())
  if (question.includes('회선')) {
    return {
      plans: [
        mockPlan(MOCK_PHONE, '5G 스탠다드', 75_000, 15 * GB),
        mockPlan(MOCK_PHONE_2, '5G 프리미어', 95_000, null),
      ],
      usages: [
        {
          phoneNumber: MOCK_PHONE,
          usage: mockUsage('2026-10', 4 * GB, 15 * GB, {
            finalized: false,
            finalizedAt: null,
            aggregatedThroughDate: today,
          }),
        },
        {
          phoneNumber: MOCK_PHONE_2,
          usage: mockUsage('2026-10', 21.4 * GB, null, {
            finalized: false,
            finalizedAt: null,
            aggregatedThroughDate: today,
          }),
        },
      ],
      billings: [
        mockBilling(MOCK_PHONE_2, '2026-10', 0, 0, false),
        mockBilling(MOCK_PHONE, '2026-10', 12_400, 0, false),
      ],
    }
  }
  const userData: ChatUserData = { plans: [], usages: [], billings: [] }
  if (question.includes('요금제'))
    userData.plans.push(mockPlan(MOCK_PHONE, '5G 스탠다드', 75_000, 15 * GB))
  if (question.includes('사용량')) {
    const usages: ChatUsageCard[] = [
      // 순서를 보장하지 않으므로 섞어서 돌려줍니다.
      {
        phoneNumber: MOCK_PHONE,
        usage: mockUsage('2026-09', 6.1 * GB, 15 * GB, {
          voiceUsedMinutes: 95,
          smsUsedCount: 3,
          remainingVoiceMinutes: null,
          remainingSmsCount: null,
          allowance: {
            dataAmountMb: 15 * GB,
            dataUnlimited: false,
            voiceMinutes: null,
            voiceUnlimited: true,
            smsCount: null,
            smsUnlimited: true,
          },
        }),
      },
      { phoneNumber: MOCK_PHONE, usage: mockUsage('2026-07', 16.3 * GB, 15 * GB) },
      {
        phoneNumber: MOCK_PHONE,
        usage: mockUsage('2026-10', 4 * GB, 15 * GB, {
          finalized: false,
          finalizedAt: null,
          aggregatedThroughDate: today,
        }),
      },
      { phoneNumber: MOCK_PHONE, usage: mockUsage('2026-08', 8.2 * GB, 10 * GB) },
    ]
    userData.usages.push(...usages)
  }
  if (question.includes('3개월')) {
    userData.billings.push(
      mockBilling(MOCK_PHONE, '2026-10', 12_400, 0, false),
      mockBilling(MOCK_PHONE, '2026-08', 0, 2_200, true),
      mockBilling(MOCK_PHONE, '2026-09', 0, 0, true),
    )
  } else if (question.includes('청구')) {
    userData.billings.push(
      mockBilling(MOCK_PHONE, '2026-10', 12_400, 0, false),
      mockBilling(MOCK_PHONE, '2026-09', 0, 0, true),
    )
  }
  const empty =
    userData.plans.length === 0 && userData.usages.length === 0 && userData.billings.length === 0
  return empty ? null : userData
}

// 상품 카드 확인용: 상품 질문 키워드가 있으면 가입 정보 카드 대신 상품 카드를 돌려줍니다.
// "로밍" → 로밍(요금 없는 상품 포함) / "부가" → 부가서비스 / "결합" → 홈 결합·가족 결합 / "요금제 하나" → 요금제 1개
// "요금제 추천" → 요금제 5개(긴 이름, 네트워크·약정가 없는 무약정 요금제, 요금·highlights 없는 상품 포함) / "추천"·"상품" → 종류별(0원 부가서비스 포함)
// network·feeNote는 요금제만 씁니다(BE PlanTools 카드).
const mockProduct = (
  type: ChatProductCard['type'],
  name: string,
  fee: number | null,
  specs: string[],
  highlights: string[],
  plan: { network?: string; feeNote?: string } = {},
): ChatProductCard => ({
  type,
  name,
  fee,
  specs,
  highlights,
  network: plan.network ?? null,
  feeNote: plan.feeNote ?? null,
})

// 요금제 specs는 BE PlanTools가 만드는 데이터·음성/문자·테더링 세 줄입니다.
const MOCK_PLAN_LITE = mockProduct(
  'PLAN',
  '5G 라이트',
  55_000,
  [
    '월 데이터 12GB, 소진 후 최대 1Mbps',
    '국내 일반 음성/문자 기본제공',
    '테더링 월 12GB, 기본 데이터에서 함께 차감, 한도 소진 후 차단',
  ],
  ['가입 대상 만 19~34세', '만 35세가 되는 달 말일까지 이용 가능', '이후 일반형 변경 상담 안내'],
  { network: '5G', feeNote: '선택약정 25% 할인 시 월 41,250원' },
)
const MOCK_ADDON = mockProduct(
  'ADDON',
  '데이터 안심 옵션',
  3_300,
  [],
  ['제공량을 다 쓰면 속도를 낮춰 계속 사용'],
)
const MOCK_BUNDLE = mockProduct(
  'BUNDLE',
  '가족 결합 할인',
  5_500,
  [],
  ['가족 회선을 묶으면 회선마다 매달 할인', '최대 5회선까지 결합 가능'],
)
const MOCK_ROAMING = mockProduct(
  'ROAMING',
  '로밍 데이터 하루 패스',
  11_000,
  ['일본', '데이터 1GB'],
  ['현지 시간 기준 24시간 이용', '소진 후 최대 400kbps'],
)

function mockProductData(question: string): ChatProductData | null {
  if (question.includes('로밍')) {
    return {
      products: [
        MOCK_ROAMING,
        mockProduct(
          'ROAMING',
          '로밍 안심 차단',
          null,
          [],
          ['해외에서 데이터 로밍을 막아 요금이 나오지 않음'],
        ),
      ],
    }
  }
  if (question.includes('부가')) return { products: [MOCK_ADDON] }
  if (question.includes('결합')) {
    return {
      products: [
        // 홈 결합은 specs에 필요한 인터넷 상품이 들어옵니다.
        mockProduct(
          'BUNDLE',
          'Ubot 홈 100 결합',
          3_300,
          ['필요 인터넷 Ubot 인터넷 100M'],
          ['휴대폰 1회선과 별도 가입한 가상 Ubot 100Mbps 인터넷 이용 시 결합 전체 월 3,300원 할인'],
        ),
        MOCK_BUNDLE,
      ],
    }
  }
  if (question.includes('요금제') && question.includes('하나'))
    return { products: [MOCK_PLAN_LITE] }
  if (question.includes('요금제') && question.includes('추천')) {
    return {
      products: [
        MOCK_PLAN_LITE,
        mockProduct(
          'PLAN',
          '5G 스탠다드',
          75_000,
          [
            '월 데이터 150GB, 소진 후 최대 5Mbps',
            '국내 일반 음성/문자 기본제공',
            '테더링 월 50GB, 기본 데이터에서 함께 차감, 한도 소진 후 차단',
          ],
          ['스마트기기 1회선 데이터 공유'],
          { network: '5G', feeNote: '선택약정 25% 할인 시 월 56,250원' },
        ),
        // 고유 정보가 없는 요금제는 세 줄만 보입니다.
        mockProduct(
          'PLAN',
          '5G 프리미어 에센셜',
          85_000,
          [
            '월 고속 데이터 무제한',
            '국내 일반 음성/문자 기본제공',
            '테더링 월 70GB, 한도 소진 후 차단',
          ],
          [],
          { network: '5G', feeNote: '선택약정 25% 할인 시 월 63,750원' },
        ),
        mockProduct(
          'PLAN',
          '5G 시그니처 무제한 가족 공유 요금제',
          130_000,
          [
            '월 고속 데이터 무제한',
            '국내 일반 음성/문자 기본제공',
            '테더링 월 100GB, 한도 소진 후 차단',
          ],
          [
            '가족 회선과 데이터 나눠 쓰기 가능',
            '스마트기기 2회선 무료',
            'OTT 구독 중 하나 매달 제공',
            '가입 후 6개월간 해지 시 혜택 회수',
          ],
          { network: '5G', feeNote: '선택약정 25% 할인 시 월 97,500원' },
        ),
        // 무약정 요금제는 약정가 문구가 없고, 요금이 없으면 요금 줄도 없습니다.
        mockProduct(
          'PLAN',
          '청소년 데이터',
          null,
          ['월 데이터 6GB, 소진 후 최대 400Kbps', '국내 음성 100분, 문자 100건', '테더링 미제공'],
          ['온라인 셀프개통 전용, 약정 없음'],
          { network: 'LTE' },
        ),
      ],
    }
  }
  if (question.includes('추천') || question.includes('상품')) {
    return {
      products: [
        MOCK_PLAN_LITE,
        MOCK_ADDON,
        mockProduct(
          'ADDON',
          '통화 연결음 체험',
          0,
          [],
          ['첫 달 무료 이용', '다음 달부터 해지 가능'],
        ),
        MOCK_BUNDLE,
        MOCK_ROAMING,
      ],
    }
  }
  return null
}

export const chatMockApi: ChatApi = {
  cancelJob: async (jobId) => ({ jobId, cancelled: true }),
  createQuestion: async (request, options) => {
    await options?.onSubmitted?.({
      jobId: ++nextMockJobId,
      status: 'QUEUED',
      conversationId: request.conversationId ?? null,
      idempotencyKey: 'a'.repeat(64),
      attemptCount: 1,
    })
    await simulateProgress(1500, options)
    const asksStore = request.question.includes('매장')
    const productData = mockProductData(request.question)
    const userData = productData ? null : mockUserData(request.question)
    return {
      answer: asksStore
        ? `[mock] 강남역 반경 3km 안에 매장 3곳이 있습니다. 가장 가까운 곳은 일상의틈_역삼동_강남역12번출구점(0.1km)입니다.`
        : productData
          ? `[mock] "${request.question}"에 대한 상품 정보입니다.`
          : userData
            ? `[mock] 2026년 10월 청구서(9월 사용분) 기준으로 안내드립니다. "${request.question}"에 대한 가입 정보입니다.`
            : `[mock] "${request.question}"에 대한 답변입니다.`,
      status: 'SUCCESS',
      idempotencyKey: 'a'.repeat(64),
      attemptCount: 1,
      retryable: false,
      store: asksStore ? { locationRequired: false, map: MOCK_STORE_MAP } : null,
      userData,
      productData,
    }
  },

  retryAnswer: async () => {
    throw new ApiRequestError('mock에서는 답변 재시도를 지원하지 않습니다.', 400)
  },

  researchAnswer: async (_idempotencyKey, request, options) => {
    await simulateProgress(1500, options)
    // 오류 카드 확인용: 내 정보 확인은 이미 사용한 의도라는 응답을 돌려줍니다.
    if (request.intent === 'USER_DATA') {
      throw new ApiRequestError('이미 해당 의도로 재검색한 질문입니다.', 409, 'CHAT-019')
    }
    const place =
      request.latitude !== undefined
        ? `위치(${request.latitude.toFixed(4)}, ${request.longitude?.toFixed(4)})`
        : '위치 없음'
    return {
      answer: `[mock] ${request.intent} 재검색 결과입니다. (${place})`,
      status: 'SUCCESS',
      idempotencyKey: 'b'.repeat(64),
      attemptCount: 1,
      retryable: false,
      // 재검색 답변의 상품 카드 확인용입니다.
      productData: request.intent === 'PRODUCT_DATA' ? mockProductData('상품') : null,
    }
  },

  getMyConversationList: async () => ({
    content: [],
    page: 0,
    size: 20,
    totalElements: 0,
    totalPages: 0,
    first: true,
    last: true,
  }),

  getConversationMessageList: async () => [],
  deleteConversation: async () => {},
}
