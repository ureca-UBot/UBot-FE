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
      networkType: '5G',
      targetGroup: '일반',
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
            aggregatedThroughDate: '2026-10-18',
          }),
        },
        {
          phoneNumber: MOCK_PHONE_2,
          usage: mockUsage('2026-10', 21.4 * GB, null, {
            finalized: false,
            finalizedAt: null,
            aggregatedThroughDate: '2026-10-18',
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
          aggregatedThroughDate: '2026-10-18',
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
// "로밍" → 로밍(요금 없는 상품 포함) / "부가" → 부가서비스 / "결합" → 결합 할인 / "추천"·"상품" → 종류별 하나씩
const mockProduct = (
  type: ChatProductCard['type'],
  name: string,
  fee: number | null,
  description: string | null,
): ChatProductCard => ({ type, name, fee, description })

function mockProductData(question: string): ChatProductData | null {
  if (question.includes('로밍')) {
    return {
      products: [
        mockProduct(
          'ROAMING',
          '로밍 데이터 하루 패스',
          11_000,
          '하루 동안 데이터를 무제한으로 씁니다.',
        ),
        mockProduct(
          'ROAMING',
          '로밍 안심 차단',
          null,
          '해외에서 데이터 로밍을 막아 요금이 나오지 않습니다.',
        ),
      ],
    }
  }
  if (question.includes('부가')) {
    return {
      products: [
        mockProduct(
          'ADDON',
          '데이터 안심 옵션',
          3_300,
          '제공량을 다 쓰면 속도를 낮춰 계속 씁니다.',
        ),
      ],
    }
  }
  if (question.includes('결합')) {
    return {
      products: [
        mockProduct(
          'BUNDLE',
          '가족 결합 할인',
          5_500,
          '가족 회선을 묶으면 회선마다 매달 할인합니다.',
        ),
      ],
    }
  }
  if (question.includes('추천') || question.includes('상품')) {
    return {
      products: [
        mockProduct('PLAN', '5G 라이트', 55_000, '데이터 12GB, 소진 후 1Mbps로 계속 씁니다.'),
        mockProduct('ADDON', '데이터 안심 옵션', 3_300, null),
        mockProduct(
          'BUNDLE',
          '가족 결합 할인',
          5_500,
          '가족 회선을 묶으면 회선마다 매달 할인합니다.',
        ),
        mockProduct(
          'ROAMING',
          '로밍 데이터 하루 패스',
          11_000,
          '하루 동안 데이터를 무제한으로 씁니다.',
        ),
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
