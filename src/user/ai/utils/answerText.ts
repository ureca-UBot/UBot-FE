const INVALID_ANSWER_MESSAGE = '알 수 없는 오류가 발생했습니다. 다시 질문해 주세요.'

// 응답 원본은 유지하고 화면에는 모델의 답변 문장만 표시합니다.
export function getAnswerText(answer = ''): string {
  const trimmedAnswer = answer.trim()
  if (!trimmedAnswer) return INVALID_ANSWER_MESSAGE

  try {
    const parsed: unknown = JSON.parse(answer)
    if (typeof parsed === 'string') return parsed.trim() ? parsed : INVALID_ANSWER_MESSAGE
    if (typeof parsed === 'object') {
      if (
        parsed !== null &&
        'answer' in parsed &&
        typeof parsed.answer === 'string' &&
        parsed.answer.trim()
      ) {
        return parsed.answer
      }
      return INVALID_ANSWER_MESSAGE
    }
  } catch {
    // JSON 형태의 응답은 원문 대신 안내를 표시하고, 일반 문장은 그대로 표시합니다.
    // "[1] 신분증을 준비해 주세요" 같은 번호 매기기 답변을 JSON 배열로 오인하지 않도록 숫자/부호는 배열 판별에서 뺍니다.
    const looksLikeJson =
      trimmedAnswer.startsWith('{') ||
      /^\[\s*(?:[{"[\]]|true\b|false\b|null\b|$)/.test(trimmedAnswer) ||
      /^```(?:json\b|\s*[{[])/i.test(trimmedAnswer)
    if (looksLikeJson) {
      return INVALID_ANSWER_MESSAGE
    }
  }
  return answer
}
