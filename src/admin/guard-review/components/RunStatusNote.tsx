import type { ReviewRun } from '../types/guardReview'
import { describeRun } from '../utils/runStatus'

/** 실행 상태 배지 아래에 재시도·실패·진행 정보를 한 줄로 보여 줍니다. */
export function RunStatusNote({ run }: { run: ReviewRun }) {
  const detail = describeRun(run)
  if (!detail) return null
  return (
    <small className={`review-run-detail review-run-detail--${detail.tone}`}>
      {detail.text}
      {detail.hint && <span className="review-run-hint">{detail.hint}</span>}
    </small>
  )
}
