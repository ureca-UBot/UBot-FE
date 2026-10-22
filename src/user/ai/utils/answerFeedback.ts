import { CHAT_INTENT_LABELS, type ChatIntent } from '../types/chat'

export type FeedbackRating = 'positive' | 'negative'

export const FEEDBACK_REASONS: Record<FeedbackRating, readonly string[]> = {
  positive: [
    '질문 해결에 도움이 돼요',
    '설명이 이해하기 쉬워요',
    '필요한 정보가 있어요',
    '안내가 정확해요',
    '빠르고 간결해요',
    '기타',
  ],
  negative: [
    '답변이 정확하지 않아요',
    '질문과 관련이 없어요',
    '필요한 내용이 빠졌어요',
    '설명이 이해하기 어려워요',
    '부적절한 표현이 있어요',
    '기타',
  ],
}
export const FEEDBACK_COMMENT_LIMIT = 300
const INQUIRY_CONTENT_LIMIT = 1000

interface FeedbackDraft {
  rating: FeedbackRating
  reasons: string[]
  comment: string
  question: string
  answer: string
  requestKey?: string | null
  conversationId?: string | null
  intent?: ChatIntent
}

// 기존 고객문의의 길이 제한을 지키되 이모지의 서로게이트 쌍을 자르지 않습니다.
function shorten(text: string, limit: number): string {
  if (text.length <= limit) return text
  if (limit <= 0) return ''
  let end = limit - 1
  const last = text.charCodeAt(end - 1)
  if (last >= 0xd800 && last <= 0xdbff) end--
  return text.slice(0, end) + '…'
}

export function buildFeedbackInquiry(draft: FeedbackDraft) {
  const comment = draft.comment.trim()
  if (comment.length > FEEDBACK_COMMENT_LIMIT)
    throw new Error('세부 내용은 300자 이내로 입력해 주세요.')
  const rating = draft.rating === 'positive' ? '좋아요' : '별로예요'
  const reasons = [...new Set(draft.reasons)].filter((reason) =>
    FEEDBACK_REASONS[draft.rating].includes(reason),
  )
  const question = draft.question.trim()
  const answer = draft.answer.trim()
  const title = shorten(`[AI 답변 의견 · ${rating}] ${question.replace(/\s+/g, ' ')}`, 200)
  const heading = [
    `평가: ${rating}`,
    `사유: ${reasons.join(', ') || '(선택하지 않음)'}`,
    `세부 내용: ${comment || '(없음)'}`,
    `답변 구분: ${draft.intent ? `${CHAT_INTENT_LABELS[draft.intent]} 재검색 답변` : '원래 답변'}`,
    ...(draft.conversationId ? [`대화: ${shorten(draft.conversationId, 80)}`] : []),
    ...(draft.requestKey ? [`요청: ${shorten(draft.requestKey, 80)}`] : []),
  ].join('\n')
  const combine = (q: string, a: string) => `${heading}\n\n질문:\n${q}\n\n답변:\n${a}`
  const full = combine(question, answer)
  if (full.length <= INQUIRY_CONTENT_LIMIT) return { title, content: full, truncated: false }

  const notice = '\n\n※ 긴 질문·답변은 일부만 첨부했습니다.'
  const available = INQUIRY_CONTENT_LIMIT - combine('', '').length - notice.length
  let questionBudget = Math.min(question.length, Math.floor(available / 3))
  const answerBudget = Math.min(answer.length, available - questionBudget)
  questionBudget = Math.min(question.length, available - answerBudget)
  return {
    title,
    content: combine(shorten(question, questionBudget), shorten(answer, answerBudget)) + notice,
    truncated: true,
  }
}
