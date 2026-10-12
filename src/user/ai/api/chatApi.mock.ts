import { ApiRequestError } from '../../../shared/api/client'
import type { ChatStoreMap } from '../types/chat'
import type { ChatApi } from './chatApi'

// 백엔드 없이 화면만 확인하기 위한 개발용 mock입니다.
// .env.local에 VITE_CHAT_MOCK=true를 넣고 개발 서버를 실행했을 때만 사용합니다.
// 재검색 API가 병합되어 실제 연동을 확인한 뒤에는 이 파일과 chatApi.ts의 스위치를 제거합니다.

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// 채팅 지도 드로어 확인용: '매장'이 들어간 질문에는 강남역 기준 매장 조회 결과를 함께 돌려줍니다. (V5 매장 데이터)
const MOCK_STORE_MAP: ChatStoreMap = {
    center: { latitude: 37.497942, longitude: 127.027621 },
    placeName: '강남역',
    radiusKm: 3,
    stores: [
        { storeId: 214, storeName: '서초2동_강남역6번출구점', sido: '서울특별시', sigungu: '서초구', address: '서울특별시 서초구 강남대로 375 101호(서초동,서초현대타워아파트)', phoneNumber: '000-0000-0214', businessHours: '09:00-18:00', latitude: 37.4964212, longitude: 127.027788, distanceKm: 0.17 },
        { storeId: 208, storeName: '일상의틈_역삼동_강남역12번출구점', sido: '서울특별시', sigungu: '강남구', address: '서울특별시 강남구 테헤란로 107 1층 (역삼동, 메디타워)', phoneNumber: '000-0000-0208', businessHours: '09:00-18:00', latitude: 37.4986915, longitude: 127.028637, distanceKm: 0.12 },
        { storeId: 201, storeName: '역삼동_역삼역점', sido: '서울특별시', sigungu: '강남구', address: '서울특별시 강남구 논현로 511 1층(역삼동,에이치에스빌딩)', phoneNumber: '000-0000-0201', businessHours: '09:00-18:00', latitude: 37.5022215, longitude: 127.035955, distanceKm: 0.87 },
    ],
}

export const chatMockApi: ChatApi = {
    createQuestion: async (request) => {
        await wait(600)
        const asksStore = request.question.includes('매장')
        return {
            answer: asksStore
                ? `[mock] 강남역 반경 3km 안에 매장 3곳이 있습니다. 가장 가까운 곳은 일상의틈_역삼동_강남역12번출구점(0.1km)입니다.`
                : `[mock] "${request.question}"에 대한 답변입니다.`,
            status: 'SUCCESS',
            idempotencyKey: 'a'.repeat(64),
            attemptCount: 1,
            retryable: false,
            store: asksStore ? { locationRequired: false, map: MOCK_STORE_MAP } : null,
        }
    },

    retryAnswer: async () => {
        throw new ApiRequestError('mock에서는 답변 재시도를 지원하지 않습니다.', 400)
    },

    researchAnswer: async (_idempotencyKey, request) => {
        await wait(800)
        // 오류 카드 확인용: 내 정보 확인은 이미 사용한 의도라는 응답을 돌려줍니다.
        if (request.intent === 'USER_DATA') {
            throw new ApiRequestError('이미 해당 의도로 재검색한 질문입니다.', 409, 'CHAT-019')
        }
        const place = request.latitude !== undefined
            ? `위치(${request.latitude.toFixed(4)}, ${request.longitude?.toFixed(4)})`
            : '위치 없음'
        return {
            answer: `[mock] ${request.intent} 재검색 결과입니다. (${place})`,
            status: 'SUCCESS',
            idempotencyKey: 'b'.repeat(64),
            attemptCount: 1,
            retryable: false,
        }
    },

    getMyConversationList: async () => ({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0, first: true, last: true }),

    getConversationMessageList: async () => [],
}
