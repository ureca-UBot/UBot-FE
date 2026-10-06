import { ApiRequestError } from '../../../shared/api/client'
import type { ChatApi } from './chatApi'

// 백엔드 없이 화면만 확인하기 위한 개발용 mock입니다.
// .env.local에 VITE_CHAT_MOCK=true를 넣고 개발 서버를 실행했을 때만 사용합니다.
// 재검색 API가 병합되어 실제 연동을 확인한 뒤에는 이 파일과 chatApi.ts의 스위치를 제거합니다.

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const chatMockApi: ChatApi = {
    createQuestion: async (request) => {
        await wait(600)
        return {
            answer: `[mock] "${request.question}"에 대한 답변입니다.`,
            status: 'SUCCESS',
            idempotencyKey: 'a'.repeat(64),
            attemptCount: 1,
            retryable: false,
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
}