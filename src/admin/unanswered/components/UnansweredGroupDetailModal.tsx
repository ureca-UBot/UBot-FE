import { useEffect, useState } from 'react'
import { adminUnansweredApi } from '../api/unansweredApi'
import {
  UNANSWERED_REASON_LABELS,
  UNANSWERED_STATUS_LABELS,
  type UnansweredGroupDetailResponse,
  type UnansweredGroupStatus,
} from '../types/unanswered'
import { UnansweredGroupFaqModal } from './UnansweredGroupFaqModal'
import { UnansweredStatusBadge } from './UnansweredGroupTable'

const STATUS_ACTIONS: UnansweredGroupStatus[] = ['PENDING', 'ON_HOLD', 'REJECTED']

function formatDate(value: string) {
  return value.replace('T', ' ').slice(0, 16)
}

interface UnansweredGroupDetailModalProps {
  groupId: number
  onClose: () => void
  onChanged: () => void
}

export function UnansweredGroupDetailModal({ groupId, onClose, onChanged }: UnansweredGroupDetailModalProps) {
  const [group, setGroup] = useState<UnansweredGroupDetailResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)
  const [registering, setRegistering] = useState(false)

  useEffect(() => {
    let cancelled = false
    adminUnansweredApi.getUnansweredGroup(groupId)
      .then((next) => { if (!cancelled) setGroup(next) })
      .catch((caught: unknown) => { if (!cancelled) setError(caught instanceof Error ? caught.message : '묶음을 불러오지 못했습니다.') })
    return () => {
      cancelled = true
    }
  }, [groupId])

  async function updateStatus(status: UnansweredGroupStatus) {
    setUpdating(true)
    setError(null)
    try {
      await adminUnansweredApi.updateUnansweredGroupStatus(groupId, { status })
      onChanged()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '상태를 변경하지 못했습니다.')
    } finally {
      setUpdating(false)
    }
  }

  const resolved = group?.resolvedFaqId != null

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div aria-labelledby="unanswered-detail-title" aria-modal="true" className="faq-modal faq-detail-modal unanswered-modal" role="dialog">
        <h2 id="unanswered-detail-title">미응답 질문 묶음 #{groupId}</h2>
        {!group && !error && <p className="page-message">불러오는 중입니다.</p>}
        {group && (
          <>
            <dl>
              <dt>대표 질문</dt><dd>{group.representativeQuestion}</dd>
              <dt>상태</dt><dd><UnansweredStatusBadge status={group.status} /></dd>
              <dt>질문 수</dt><dd>{group.questionCount}건</dd>
              <dt>마지막 발생</dt><dd>{formatDate(group.lastOccurredAt)}</dd>
              {resolved && <><dt>등록 FAQ</dt><dd>FAQ #{group.resolvedFaqId}</dd></>}
            </dl>
            <div className="unanswered-question-list">
              {group.questions.map((question) => (
                <p key={question.id}>
                  <span>{question.question}</span>
                  <small>
                    {UNANSWERED_REASON_LABELS[question.reason]}
                    {question.bestSimilarity != null && ` · 최고 유사도 ${question.bestSimilarity.toFixed(2)}`}
                    {` · ${formatDate(question.createdAt)}`}
                  </small>
                </p>
              ))}
            </div>
          </>
        )}
        {error && <p className="login-error">{error}</p>}
        <div className="faq-modal__actions">
          {group && !resolved && STATUS_ACTIONS.filter((status) => status !== group.status).map((status) => (
            <button className="secondary-button" disabled={updating} key={status} onClick={() => void updateStatus(status)} type="button">
              {UNANSWERED_STATUS_LABELS[status]}
            </button>
          ))}
          {group && !resolved && (
            <button className="primary-button" disabled={updating} onClick={() => setRegistering(true)} type="button">FAQ로 등록</button>
          )}
          <button className="secondary-button" onClick={onClose} type="button">닫기</button>
        </div>
      </div>
      {group && registering && (
        <UnansweredGroupFaqModal group={group} onClose={() => setRegistering(false)} onCreated={onChanged} />
      )}
    </div>
  )
}
